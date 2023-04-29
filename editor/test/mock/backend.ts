
import type IBackend from "../../src/Backend.js";
import Project from "../../src/model/Project.js";
import type ProjectItem from "../../src/model/ProjectItem.js";

export default class Backend implements IBackend {
  async listProjects():Promise<string[]> {
    return []
  }
  async openProject(projectName:string):Promise<Project> {
    return new Project(this, "project");
  }
  async saveProject(project:Project) {
    return;
  }
  async buildProject(projectName:string) {
    return "";
  }
  async releaseProject(projectName:string, releaseType:string) {
    return;
  }
  async listItems(projectName:string):Promise<ProjectItem[]> {
    return [];
  }
  async readItemData(projectName:string, itemPath:string):Promise<string> {
    return "{}";
  }
  async writeItemData(projectName:string, itemPath:string, data:string):Promise<void> {
    throw "writeItemData not mocked";
  }
  async deleteItem(projectName:string, itemPath:string):Promise<void> {
    return;
  }
  async getState(stateName:string, defaultValue:any) {
    return {};
  }
  async setState(stateName:string, data:any) {
    return;
  }
}
