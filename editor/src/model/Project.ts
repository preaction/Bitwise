
import type IBackend from '../Backend.js';
import type { DirectoryItem } from '../Backend.js';
import ProjectItem from './ProjectItem.js';

import {EventEmitter} from 'events';
import type {Game} from '@fourstar/bitwise';

export default class Project extends EventEmitter {
  backend:IBackend;
  name:string;
  state:{ [key:string]: any } = {};
  private gameFile:string|null = null;
  private gameClass:typeof Game|null = null;
  constructor( backend:IBackend, name:string ) {
    super();
    this.backend = backend;
    this.name = name;
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

  async listItems():Promise<ProjectItem[]> {
    const descend = async (dirItem:DirectoryItem) => {
      let itemType:string;
      if ( dirItem.children ) {
        // Descend
        itemType = 'directory';
      }
      else if ( dirItem.path.match( /\.(?:png|jpe?g|gif)$/ ) ) {
        itemType = 'image';
      }
      else if ( dirItem.path.match( /\.(?:md|markdown)$/ ) ) {
        itemType = 'markdown';
      }
      else if ( dirItem.path.match( /\.[jt]s$/ ) ) {
        itemType = 'gameModule';
      }
      else if ( dirItem.path.match( /\.vue$/ ) ) {
        itemType = 'editorComponent';
      }
      else if ( dirItem.path.match( /\.json$/ ) ) {
        const json = await this.backend.readItemData( this.name, dirItem.path );
        const data = JSON.parse( json );
        itemType = data.component;
      }
      else {
        itemType = 'unknown';
      }
      const projectItem = new ProjectItem( this, dirItem.path, itemType );
      if ( dirItem.children ) {
        projectItem.children = await Promise.all( dirItem.children.map((i:DirectoryItem) => descend(i)) );
      }
      return projectItem;
    };

    const projectItems = await this.backend.listItems( this.name )
      .then( async ( items:DirectoryItem[] ) => {
        return Promise.all( items.map( descend ) );
      });
    return projectItems;
  }
}

