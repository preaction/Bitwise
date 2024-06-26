import type Project from "./model/Project.js";

export type DirectoryItem = {
  path: string,
  children?: DirectoryItem[],
};

export type ProjectChange = {
  eventType: string,
  filename: string | null,
};

export default interface Backend {
  listProjects(): Promise<string[]>;
  openProject(projectName: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  buildProject(projectName: string): Promise<string>;
  releaseProject(projectName: string, releaseType: string): Promise<void>;

  listItems(projectName: string): Promise<DirectoryItem[]>;
  readItemData(projectName: string, itemPath: string): Promise<string>;
  writeItemData(projectName: string, itemPath: string, data: string): Promise<void>;
  deleteItem(projectName: string, itemPath: string): Promise<void>;

  getState(stateName: string, defaultValue: any): Promise<any>;
  setState(stateName: string, data: any): Promise<void>;

  on(type: "change", cb: (changes: ProjectChange[]) => void): void;
}
