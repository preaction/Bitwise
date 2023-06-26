
import type IBackend from '../Backend.js';
import type { DirectoryItem } from '../Backend.js';
import ProjectItem from './ProjectItem.js';
import Atlas from './projectitem/Atlas.js';

import {EventEmitter} from 'events';
import type {Game} from '@fourstar/bitwise';
import Texture from './projectitem/Texture.js';

/**
 * Project is the main model class. This class manages project items and
 * handles loading the game class. The Project class uses a Backend
 * class to read and write file data as needed.
 *
 * Most editor components should use the Project object to do their
 * work. The Project object handles details about virtual items.
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
   * All of the items in this project. Use inflateItems() to add
   * ProjectItem objects to this array.
   */
  readonly items:ProjectItem[] = [];

  state:{ [key:string]: any } = {};
  private gameFile:string|null = null;
  private gameClass:typeof Game|null = null;
  constructor( backend:IBackend, name:string ) {
    super();
    this.backend = backend;
    this.name = name;
  }

  async readItemData( path:string ):Promise<string> {
    // XXX: This needs to handle virtual project items
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

  /**
   * inflateItems creates ProjectItem objects from the given
   * DirectoryItem objects and adds them to the project's items array.
   * This is used by the backend when opening the project and listing
   * its contents.
   */
  async inflateItems( items:DirectoryItem[] ):Promise<ProjectItem[]> {
    const descend = async (dirItem:DirectoryItem) => {
      let projectItem:ProjectItem|null = null;
      if ( dirItem.children ) {
        // Descend
        projectItem = new ProjectItem( this, dirItem.path, "directory" );
      }
      else if ( dirItem.path.match( /\.(?:png|jpe?g|gif)$/ ) ) {
        projectItem = new Texture( this, dirItem.path );
      }
      else if ( dirItem.path.match( /\.(?:md|markdown)$/ ) ) {
        projectItem = new ProjectItem( this, dirItem.path, "markdown" );
      }
      else if ( dirItem.path.match( /\.[jt]s$/ ) ) {
        projectItem = new ProjectItem( this, dirItem.path, "gameModule" );
      }
      else if ( dirItem.path.match( /\.vue$/ ) ) {
        projectItem = new ProjectItem( this, dirItem.path, "editorComponent" );
      }
      else if ( dirItem.path.match( /\.json$/ ) ) {
        const json = await this.backend.readItemData( this.name, dirItem.path );
        const data = JSON.parse( json );
        projectItem = new ProjectItem( this, dirItem.path, data.component );
      }
      else if ( dirItem.path.match( /\.xml$/ ) ) {
        const xml = await this.backend.readItemData( this.name, dirItem.path );
        const dom = new DOMParser().parseFromString(xml, "application/xml");
        if ( dom.documentElement.tagName.toLowerCase() === "textureatlas" ) {
          projectItem = new Atlas( this, dirItem.path ).parseDOM(dom);
        }
      }
      if (!projectItem) {
        projectItem = new ProjectItem( this, dirItem.path, "unknown" );
      }
      if ( dirItem.children ) {
        projectItem.children = await Promise.all( dirItem.children.map((i:DirectoryItem) => descend(i)) );
      }
      return projectItem;
    };

    const projectItems = await Promise.all( items.map( descend ) );
    this.items.push( ...projectItems );
    return projectItems;
  }
}

