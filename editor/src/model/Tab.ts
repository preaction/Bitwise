
import type { Asset } from '@fourstar/bitwise';
import type IBackend from '../Backend.js';
import type Project from './Project.js';

export default class Tab {
  private asset: Asset;
  project: Project;
  name: string = '';
  ext: string = '';
  icon: string = '';
  src: string = '';
  component: string = '';
  edited: boolean = false;
  get projectName(): string {
    return this.project.name;
  }
  get backend(): IBackend {
    return this.project.backend;
  }

  constructor(project: Project, asset: Asset) {
    this.project = project;
    this.asset = asset;
    this.src = asset.path;
    const fileName = this.src.split('/').pop() || '';
    this.name = fileName.substring(0, fileName.lastIndexOf('.'));
    this.ext = fileName.substring(fileName.lastIndexOf('.'));
  }
  async readFile() {
    return this.project.readItemData(this.asset.path)
  }
  async writeFile(data: any) {
    // XXX: Instead of using `electron` and `confirm`, maybe this should
    // trow error types that the app can catch and handle so that this
    // class can be used outside of Electron.

    // No src? Open save as dialog
    if (!this.src) {
      const res = await electron.newFile(this.projectName, this.name, this.ext);
      console.log('res.filePath', res.filePath);
      this.src = res.filePath;
      const fileName = this.src.split('/').pop() || '';
      this.name = fileName.substring(0, fileName.lastIndexOf('.'));
      this.ext = fileName.substring(fileName.lastIndexOf('.'));
      console.log('save as dialog filename', fileName);
    }

    // Name changes? Write new file and delete old
    if (this.src != this.name + this.ext && !this.src.endsWith('/' + this.name + this.ext)) {
      const oldSrc = this.src;
      const newSrc = oldSrc.replace(oldSrc.substring(oldSrc.lastIndexOf('/') + 1), this.name + this.ext);
      try {
        await this.readFile();
        // If we've got a file, the file exists.
        // Ask to overwrite
        if (!confirm(`File ${newSrc} exists. Overwrite?`)) {
          return;
        }
      }
      catch (e) {
        // File does not exist, continue...
      }
      this.src = newSrc;
      this.asset.path = this.src;
      await this.project.writeItemData(this.asset.path, data);
      await this.backend.deleteItem(this.projectName, oldSrc);
      return;
    }
    // Otherwise, just write the data!
    this.asset.path = this.src;
    await this.project.writeItemData(this.asset.path, data);
  }
}
