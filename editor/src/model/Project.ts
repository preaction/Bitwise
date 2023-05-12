
import type IBackend from '../Backend.js';
import type { DirectoryItem } from '../Backend.js';
import ProjectItem from './ProjectItem.js';

export default class Project {
  backend:IBackend;
  name:string;
  state:{ [key:string]: any } = {};
  constructor( backend:IBackend, name:string ) {
    this.backend = backend;
    this.name = name;
  }
  async listItems():Promise<ProjectItem[]> {
    const descend = async (dirItem:DirectoryItem) => {
      let itemType:string;
      if ( dirItem.children?.length ) {
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
      if ( dirItem.children?.length ) {
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

