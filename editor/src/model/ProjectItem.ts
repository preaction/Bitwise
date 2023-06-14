
import type Project from './Project.js';

/**
 * ProjectItem is the base class of a single project item. Items may be
 * actual (files and folders) or virtual (slices of an image).
 */
export default class ProjectItem {
  project:Project;
  /**
   * The location of this item. Actual items' paths will be URIs.
   * Virtual items' URIs will contain a fragment identifying the virtual
   * part. This fragment may vary based on the parent item, but should
   * most often be a JSON Pointer.
   */
  path:string;
  // XXX: We don't need "type" if we use subclasses for useful
  // discrimination (like image types, scene types, container types, etc...)
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
    return this.project.readItemData( this.path );
  }
  async readJSON():Promise<any> {
    return this.read().then( data => JSON.parse(data) );
  }
  async write( data:string ):Promise<void> {
    return this.project.writeItemData( this.path, data );
  }
  async writeJSON( data:any ):Promise<void> {
    return this.write( JSON.stringify(data) );
  }
}
