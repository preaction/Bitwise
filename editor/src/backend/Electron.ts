import type Backend from '../Backend.js';
import Project from '../Project.js';
import ProjectItem from '../ProjectItem.js';

export default class Electron implements Backend {
  private projects:{ [key:string]: Project } = {};
  async listProjects():Promise<Project[]> {
    // List the most recent projects
    const projectNames = electron.store.get( 'app', 'recentProjects', [] )
    return projectNames.map( (name:string) => this.projects[name] = new Project(this, name) );
  }

  async openProject(projectName:string):Promise<void> {
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
        const json = await this.readItem( projectName, dirItem.path );
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
  async readItem( projectName:string, itemPath:string ):Promise<string> {
    return electron.readFile( projectName, itemPath );
  }

  // write
  async writeItem( projectName:string, itemPath:string, data:string ):Promise<void> {
    return electron.saveFile( projectName, itemPath, data );
  }

  // delete
  async deleteItem( projectName:string, itemPath:string ):Promise<void> {
    return electron.deleteTree( projectName, itemPath );
  }
}

