import type Backend from '../Backend.js';
import Project from '../model/Project.js';
import ProjectItem from '../model/ProjectItem.js';

export default class Electron implements Backend {
  private projects:{ [key:string]: Project } = {};
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
    const gameFile = await electron.buildProject( projectName );
    return gameFile;
  }

  async releaseProject(projectName:string, releaseType:string):Promise<void> {
    await electron.releaseProject( projectName, releaseType );
    return;
  }

  async listItems( projectName:string ):Promise<ProjectItem[]> {
    const ignore = (dirItem:DirectoryItem) => {
      return !dirItem.path.match( /(?:^|\/)\./ ) &&
        !dirItem.path.match(/(?:^|\/)node_modules(?:$|\/)/) &&
        !dirItem.path.match(/^(tsconfig|bitwise|package(-lock)?)\.json$/);
    };

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
        const json = await this.readItemData( projectName, dirItem.path );
        const data = JSON.parse( json );
        itemType = data.component;
      }
      else {
        itemType = 'unknown';
      }
      const projectItem = new ProjectItem( this.projects[projectName], dirItem.path, itemType );
      if ( dirItem.children?.length ) {
        projectItem.children = await Promise.all( dirItem.children.filter( ignore ).map((i:DirectoryItem) => descend(i)) );
      }
      return projectItem;
    };

    const projectItems = await electron.readProject(projectName)
      .then( async ( items:DirectoryItem[] ) => {
        return Promise.all( items.filter( ignore ).map( descend ) );
      });
    return projectItems;
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

