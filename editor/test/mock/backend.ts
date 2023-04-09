
import type IBackend from "../../src/Backend.js";
import type Project from "../../src/Project.js";
import type ProjectItem from "../../src/ProjectItem.js";

export default class Backend implements IBackend {
  async listProjects():Promise<Project[]> {
    return []
  }
  async openProject(projectName:string):Promise<void> {
    return;
  }
  async listItems(projectName:string):Promise<ProjectItem[]> {
    return [];
  }
  async readItem(projectName:string, itemPath:string):Promise<string> {
    return "";
  }
  async writeItem(projectName:string, itemPath:string, data:string):Promise<void> {
    return;
  }
  async deleteItem(projectName:string, itemPath:string):Promise<void> {
    return;
  }
}
