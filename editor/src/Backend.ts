import type Project from "./Project.js";
import type ProjectItem from "./ProjectItem.js";

export default interface Backend {
  listProjects():Promise<string[]>;
  openProject(projectName:string):Promise<Project>;
  saveProject(project:Project):Promise<void>;
  buildProject(projectName:string):Promise<string>;
  releaseProject(projectName:string, releaseType:string):Promise<void>;

  listItems(projectName:string):Promise<ProjectItem[]>;
  readItemData(projectName:string, itemPath:string):Promise<string>;
  writeItemData(projectName:string, itemPath:string, data:string):Promise<void>;
  deleteItem(projectName:string, itemPath:string):Promise<void>;

  getState(stateName:string, defaultValue:any):Promise<any>;
  setState(stateName:string, data:any):Promise<void>;
}
