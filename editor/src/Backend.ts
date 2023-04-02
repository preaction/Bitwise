import type Project from "./Project.js";
import type ProjectItem from "./ProjectItem.js";

export default interface Backend {
  listProjects():Promise<Project[]>;
  openProject(projectName:string):Promise<void>;
  listItems(projectName:string):Promise<ProjectItem[]>;
  readItem(projectName:string, itemPath:string):Promise<string>;
  writeItem(projectName:string, itemPath:string, data:string):Promise<void>;
  deleteItem(projectName:string, itemPath:string):Promise<void>;
}
