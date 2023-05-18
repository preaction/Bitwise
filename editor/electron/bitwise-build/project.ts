
import { promises as fs } from 'node:fs';
import * as path from 'node:path'

type projectFile = {
  name: string,
  ext: string,
  path: string,
  isDirectory: boolean,
  children?: projectFile[],
};

export async function getProjectTree( filePath:string, root:string='' ):Promise<projectFile[]> {
  if ( root == '' ) {
    root = filePath;
    filePath = '';
  }
  return fs.readdir( path.join(root, filePath), { withFileTypes: true })
  .then( async (paths) => {
    return Promise.all(
      paths.map( async p => {
        const ext = p.isFile() ? p.name.substring( p.name.lastIndexOf( '.' ) ) : '';
        const item:projectFile = {
          name: p.name.substring( 0, p.name.length - ext.length ),
          ext,
          path: path.join( filePath, p.name ),
          isDirectory: false,
        };
        if ( p.isDirectory() ) {
          item.isDirectory = true;
          item.children = await getProjectTree( item.path, root );
        }
        return item;
      })
    );
  });
}
