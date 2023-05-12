import type Backend from '../Backend.js';
import type { DirectoryItem } from '../Backend.js';
import Project from '../model/Project.js';
import {EventEmitter} from 'events';
export default class Electron extends EventEmitter implements Backend {
  async listProjects():Promise<string[]> {
    // List the most recent projects
    const projectNames = electron.store.get( 'app', 'recentProjects', [] )
    return projectNames;
  }

  async openProject(projectName:string):Promise<Project> {
    // Update the recent projects list
    const projectNames = electron.store.get( 'app', 'recentProjects', [] )
    const i = projectNames.indexOf( projectName );
    if ( i >= 0 ) {
      projectNames.splice(i, 1);
    }
    projectNames.unshift( projectName );
    // Keep the last few projects only
    projectNames.length = Math.min( projectNames.length, 5 );
    electron.store.set( 'app', 'recentProjects', projectNames );
    return new Project(this, projectName);
  }

  async saveProject(project:Project):Promise<void> {
    const jsonData = JSON.stringify( project.state );
    return this.writeItemData( project.name, "bitwise.json", jsonData );
  }

  async buildProject(projectName:string):Promise<string> {
    this.emit('buildstart');
    const gameFile = await electron.buildProject( projectName );
    this.emit('buildend', gameFile);
    return gameFile;
  }

  async releaseProject(projectName:string, releaseType:string):Promise<void> {
    await electron.releaseProject( projectName, releaseType );
    return;
  }

  async listItems( projectName:string ):Promise<DirectoryItem[]> {
    const ignore = (dirItem:DirectoryItem) => {
      return !dirItem.path.match( /(?:^|\/)\./ ) &&
        !dirItem.path.match(/(?:^|\/)node_modules(?:$|\/)/) &&
        !dirItem.path.match(/^(tsconfig|bitwise|package(-lock)?)\.json$/);
    };

    const descend = (dirItem:DirectoryItem) => {
      if ( dirItem.children?.length ) {
        dirItem.children = dirItem.children.filter( ignore ).map((i:DirectoryItem) => descend(i));
      }
      return dirItem;
    };

    return await electron.readProject(projectName)
      .then( async ( items:DirectoryItem[] ) => {
        return items.filter( ignore ).map( descend );
      });
  }

  // read
  async readItemData( projectName:string, itemPath:string ):Promise<string> {
    return electron.readFile( projectName, itemPath );
  }

  // write
  async writeItemData( projectName:string, itemPath:string, data:string ):Promise<void> {
    return electron.saveFile( projectName, itemPath, data );
  }

  // delete
  async deleteItem( projectName:string, itemPath:string ):Promise<void> {
    return electron.deleteTree( projectName, itemPath );
  }

  async getState( stateName:string, defaultValue:any ):Promise<any>{
    return electron.store.get( "app", stateName, defaultValue );
  }

  async setState( stateName:string, data:any ):Promise<void> {
    return electron.store.set( "app", stateName, data );
  }
}

