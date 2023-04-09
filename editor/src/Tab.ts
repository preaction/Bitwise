
import type ProjectItem from './ProjectItem.js';
import type IBackend from './Backend.js';

// XXX: Now, make Tab class with test. Must create mock backend. Should
// use Project and ProjectItem classes.
// XXX: Then, switch editor tabs to use tab objects as modelValue.
export default class Tab {
  private projectItem:ProjectItem;
  name: string = '';
  ext: string = '';
  icon: string = '';
  src: string = '';
  component: string = '';
  edited: boolean = false;
  get projectName():string {
    return this.projectItem.project.name;
  }
  get backend():IBackend {
    return this.projectItem.project.backend;
  }

  constructor( item:ProjectItem ) {
    this.projectItem = item;
    this.src = item.path;
    const fileName = this.src.split('/').pop() || '';
    this.name = fileName.substring(0, fileName.lastIndexOf('.'));
    this.ext = fileName.substring(fileName.lastIndexOf('.'));
  }
  async readFile() {
    return this.projectItem.readJSON();
  }
  async writeFile( data:any ) {
    // XXX: Instead of using `electron` and `confirm`, maybe this should
    // throw error types that the app can catch and handle so that this
    // class can be used outside of Electron.

    // No src? Open save as dialog
    if ( !this.src ) {
      const res = await electron.newFile( this.projectName, this.name, this.ext );
      this.src = res.filePath;
      const fileName = this.src.split('/').pop() || '';
      this.name = fileName.substring(0, fileName.lastIndexOf('.'));
      this.ext = fileName.substring(fileName.lastIndexOf('.'));
    }

    // Name changes? Write new file and delete old
    if ( this.src != this.name + this.ext || !this.src.endsWith('/' + this.name + this.ext) ) {
      const oldSrc = this.src;
      const newSrc = oldSrc.replace( oldSrc.substring( oldSrc.lastIndexOf( '/' ) + 1 ), this.name + this.ext );
      try {
        await this.readFile();
        // If we've got a file, the file exists.
        // Ask to overwrite
        if ( !confirm( `File ${newSrc} exists. Overwrite?` ) ) {
          return;
        }
      }
      catch (e) {
        // File does not exist, continue...
      }
      this.src = newSrc;
      this.projectItem.path = this.src;
      await this.projectItem.writeJSON( data );
      await this.backend.deleteItem( this.projectName, oldSrc );
      return;
    }
    // Otherwise, just write the data!
    this.projectItem.path = this.src;
    await this.projectItem.writeJSON( data );
  }
}
