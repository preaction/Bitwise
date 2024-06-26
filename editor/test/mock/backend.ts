
import type { DirectoryItem } from "../../src/Backend.js";
import type IBackend from "../../src/Backend.js";
import Project from "../../src/model/Project.js";

export default class Backend implements IBackend {
  async listProjects(): Promise<string[]> {
    return []
  }
  async openProject(projectName: string): Promise<Project> {
    return new Project(this, "project");
  }
  async saveProject(project: Project) {
    return;
  }
  async buildProject(projectName: string) {
    return "";
  }
  async releaseProject(projectName: string, releaseType: string) {
    return;
  }
  async listItems(projectName: string): Promise<DirectoryItem[]> {
    return [];
  }
  async readItemData(projectName: string, itemPath: string): Promise<string> {
    return "{}";
  }
  async writeItemData(projectName: string, itemPath: string, data: string): Promise<void> {
    throw "writeItemData not mocked";
  }
  async deleteItem(projectName: string, itemPath: string): Promise<void> {
    return;
  }
  async getState(stateName: string, defaultValue: any) {
    return defaultValue || {};
  }
  async setState(stateName: string, data: any) {
    return;
  }

  on(eventType: string, cb: Function) {
    this.listeners[eventType] ??= [];
    this.listeners[eventType].push(cb);
    return;
  }
  listeners: { [key: string]: Array<Function> } = {}

  emit(eventType: string, ...args: any[]) {
    for (const cb of this.listeners[eventType]) {
      cb(...args);
    }
  }
}
