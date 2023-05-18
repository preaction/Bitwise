
import type Project from './Project.js';
export default class ProjectItem {
  project:Project;
  path:string;
  type:string;
  children?:ProjectItem[];
  constructor( project:Project, path:string, type:string ) {
    if ( !project ) {
      throw new Error("ProjectItem: Project must be given to constructor");
    }
    this.project = project;
    this.path = path;
    this.type = type;
  }
  async read():Promise<string> {
    return this.project.backend.readItemData( this.project.name, this.path );
  }
  async readJSON():Promise<any> {
    return this.read().then( data => JSON.parse(data) );
  }
  async write( data:string ):Promise<void> {
    return this.project.backend.writeItemData( this.project.name, this.path, data );
  }
  async writeJSON( data:any ):Promise<void> {
    return this.write( JSON.stringify(data) );
  }
}
