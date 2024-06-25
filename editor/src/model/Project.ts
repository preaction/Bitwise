
import type IBackend from '../Backend.js';
import type { DirectoryItem } from '../Backend.js';

import {EventEmitter} from 'events';
import {Load, Asset, type Game, Texture} from '@fourstar/bitwise';
import Directory from '../asset/Directory.js';
import Markdown from '../asset/Markdown.js';
import GameModule from '../asset/GameModule.js';
import EditorComponent from '../asset/EditorComponent.js';

/**
 * Project is the main model class. This class manages project assets and
 * handles loading the game class. The Project class uses a Backend
 * class to read and write file data as needed.
 *
 * Most editor components should use the Project object to do their
 * work. The Project object handles details about virtual assets.
 */
export default class Project extends EventEmitter {
  /**
   * The API for reading and writing project data.
   */
  backend:IBackend;
  /**
   * The identifier for this project. Likely a path or URI that has
   * meaning to the Backend.
   */
  name:string;

  /**
   * All of the assets in this project. Use inflateItems() to add
   * Asset objects to this array.
   */
  readonly assets:Asset[] = [];

  load:Load;

  state:{ [key:string]: any } = {};
  private gameFile:string|null = null;
  private gameClass:typeof Game|null = null;
  constructor( backend:IBackend, name:string ) {
    super();
    this.backend = backend;
    this.name = name;
    this.load = new Load();
  }

  async readItemData( path:string ):Promise<string> {
    // XXX: This needs to handle virtual project Asset
    return this.backend.readItemData( this.name, path );
  }

  async writeItemData( path:string, data:string ):Promise<void> {
    // XXX: This needs to handle virtual project items
    return this.backend.writeItemData( this.name, path, data );
  }

  async loadGameClass():Promise<typeof Game> {
    this.emit( 'loadstart' );
    if ( !this.gameFile ) {
      this.gameFile = await this.backend.buildProject( this.name );
      if ( !this.gameFile ) {
        throw 'Error building project: No game file returned';
      }
    }
    const mod = await import( /* @vite-ignore */ this.gameFile );
    this.emit( 'loadend', mod.default );
    return mod.default;
  }

  assetPromise: Promise<Asset[]> | null = null;
  async getAssets(): Promise<Asset[]> {
    if (this.assetPromise) {
      return this.assetPromise;
    }
    return this.assetPromise = new Promise((resolve) => {
      this.backend.listItems(this.name).then(this.inflateItems.bind(this)).then(resolve);
    });
  }

  /**
   * inflateItems creates Asset objects from the given
   * DirectoryItem objects and adds them to the project's assets array.
   * This is used by the backend when opening the project and listing
   * its contents.
   */
  private async inflateItems(items: DirectoryItem[]): Promise<Asset[]> {
    const descend = async (dirItem: DirectoryItem) => {
      let asset: Asset | null = null;
      if (dirItem.children) {
        // Descend
        asset = new Directory(this.load, dirItem.path);
      }
      else if (dirItem.path.match(/\.(?:png|jpe?g|gif)$/)) {
        asset = new Texture(this.load, dirItem.path);
      }
      else if (dirItem.path.match(/\.(?:md|markdown)$/)) {
        asset = new Markdown(this.load, dirItem.path);
      }
      else if (dirItem.path.match(/\.[jt]s$/)) {
        asset = new GameModule(this.load, dirItem.path);
      }
      else if (dirItem.path.match(/\.vue$/)) {
        asset = new EditorComponent(this.load, dirItem.path);
      }
      else if (dirItem.path.match(/\.json$/)) {
        const json = await this.backend.readItemData(this.name, dirItem.path);
        asset = new Asset(this.load, dirItem.path);
        asset.data = JSON.parse(json);
      }
      else if (dirItem.path.match(/\.xml$/)) {
        const xml = await this.backend.readItemData(this.name, dirItem.path);
        asset = this.load.inflate(dirItem.path, xml);
      }
      if (!asset) {
        asset = new Asset(this.load, dirItem.path);
      }
      if (dirItem.children) {
        asset.children = await Promise.all(dirItem.children.map((i: DirectoryItem) => descend(i)));
      }
      return asset;
    };

    const assets = await Promise.all(items.map(descend));
    this.assets.push(...assets);
    return assets;
  }
}

