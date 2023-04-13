
import type IBackend from './Backend.js';
import type ProjectItem from './ProjectItem.js';
export default class Project {
  backend:IBackend;
  name:string;
  state:{ [key:string]: any } = {};
  constructor( backend:IBackend, name:string ) {
    this.backend = backend;
    this.name = name;
  }
  async listItems():Promise<ProjectItem[]> {
    return this.backend.listItems( this.name );
  }
}

