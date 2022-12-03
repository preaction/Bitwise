import { Stats, promises as fs } from 'node:fs';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron'
import * as os from 'os'
import * as path from 'path'
import { init } from '../bitwise-build/init';
import { check, build } from '../bitwise-build/build';
import { release } from '../bitwise-build/release';

// Initialize electron-store
import Store from 'electron-store'
ipcMain.on('electron-store-get', async (event, file, val, def) => {
  const store = new Store({ name: file });
  event.returnValue = store.get(val, def);
});
ipcMain.on('electron-store-set', async (event, file, key, val) => {
  const store = new Store({ name: file });
  store.set(key, val);
});

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

export const ROOT_PATH = {
  // /dist
  dist: path.join(__dirname, '../..'),
  // /dist or /public
  public: path.join(__dirname, app.isPackaged ? '../..' : '../../../public'),
}

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = path.join(__dirname, '../preload/index.js')
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`
const indexHtml = path.join(ROOT_PATH.dist, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(ROOT_PATH.public, 'favicon.ico'),
    webPreferences: {
      preload,
    },
  })

  if (app.isPackaged) {
    win.loadFile(indexHtml)
  } else {
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// new window example arg: new windows url
ipcMain.handle('open-win', (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
    },
  })

  if (app.isPackaged) {
    childWindow.loadFile(indexHtml, { hash: arg })
  } else {
    childWindow.loadURL(`${url}/#${arg}`)
    // childWindow.webContents.openDevTools({ mode: "undocked", activate: true })
  }
})

ipcMain.handle('bitwise-open-project', event => {
  if ( !win ) {
    return;
  }
  return dialog.showOpenDialog(win, {
    filters: [],
    properties: [ 'openDirectory', 'createDirectory' ],
  });
});

ipcMain.handle('bitwise-new-project', event => {
  if ( !win ) {
    return;
  }
  return dialog.showSaveDialog(win, {
    defaultPath: 'New Project',
    filters: [],
    properties: [ 'createDirectory' ],
  })
  .then(
    (res) => {
      const projectRoot = res.filePath;
      if ( projectRoot ) {
        // XXX: What to do if directory exists?
        return fs.mkdir(projectRoot).then(() => {
          return init(projectRoot, resourcesPath);
        })
        .then( () => res );
      }
      return res
    },
  );
});

type projectFile = {
  name: string,
  ext: string,
  path: string,
  isDirectory: boolean,
  children?: projectFile[],
};

async function descend( filePath:string, root:string='' ):Promise<projectFile[]> {
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
          item.children = await descend( item.path, root );
        }
        return item;
      })
    );
  });
}

let aborter:AbortController;
ipcMain.handle('bitwise-read-project', (event, path) => {
  if ( !win ) {
    return;
  }
  if ( aborter ) {
    aborter.abort();
  }
  aborter = new AbortController();

  const watcher = fs.watch( path, { signal: aborter.signal, recursive: true, persistent: false } );
  (async () => {
    try {
      for await (const event of watcher) {
        win.webContents.send( 'watch', event );
      }
    }
    catch ( err:any ) {
      if (err.name === 'AbortError') {
        return;
      }
      throw err;
    }
  })();
  return descend(path);
});

// Register a protocol to allow reading files from the project root
protocol.registerSchemesAsPrivileged([
  { scheme: 'bfile', privileges: { standard: true, supportFetchAPI: true, bypassCSP: true } }
]);
app.whenReady().then(() => {
  protocol.registerFileProtocol('bfile', (request, callback) => {
    const url = request.url.substr(8);
    callback({ path: path.normalize(`${url}`) });
  })
})

ipcMain.handle('bitwise-new-file', ( event, root, name, ext, data ) => {
  if ( !win ) {
    return;
  }
  // XXX: Ensure extension on filename
  return dialog.showSaveDialog(win, {
    defaultPath: path.join( root, name ),
    filters: [ { name: ext, extensions: [ext] } ],
    properties: [ 'createDirectory' ],
  })
  .then(
    (res) => {
      if ( res.filePath ) {
        if ( !res.filePath.match( "\\." + ext + "$" ) ) {
          res.filePath += '.' + ext;
        }
        // XXX: Write to new file then rename to avoid losing data
        return fs.writeFile( res.filePath, data ).then( () => res );
      }
      return res
    },
  );
});

ipcMain.handle('bitwise-save-file', (event, path, data) => {
  // XXX: Write to new file then rename to avoid losing data
  return fs.writeFile( path, data );
});

ipcMain.handle('bitwise-read-file', (event, path) => {
  return fs.readFile( path, { encoding: 'utf8' } );
});

ipcMain.handle('bitwise-delete-tree', (event, root, tree) => {
  return fs.rm( path.join( root, tree ), { recursive: true } );
});

ipcMain.handle('bitwise-rename-path', (event, root, from, to) => {
  return fs.rename( path.join( root, from ), path.join( root, to ) );
});

async function linkModules( root:string ) {
  // Make sure the project has all necessary dependencies linked in
  const modulesDir = path.resolve( __dirname.replace( 'app.asar', '' ), '../../../node_modules' );
  await fs.mkdir( path.join( root, 'node_modules', '@fourstar' ), { recursive: true } );
  await fs.mkdir( path.join( root, 'node_modules', '@types' ), { recursive: true } );
  for ( const dep of [ '@fourstar/bitwise', 'three', '@types/three', 'bitecs', 'ammo.js', 'typescript', 'tslib' ] ) {
    const linkPath = path.join( root, 'node_modules', dep );
    await fs.stat( linkPath ).then( () => {}, () => {
      console.log( `Adding link to ${dep} in ${root}` );
      return fs.symlink( path.join( modulesDir, dep ), path.join( root, 'node_modules', dep ) );
    } );
  }
}

ipcMain.handle('bitwise-build-project', async (event, root) => {
  if ( !win ) {
    return;
  }
  const webwin = win;
  return fs.mkdtemp( path.join(os.tmpdir(), 'bitwise-') ).then( async destDir => {
    const dest = path.join( destDir, 'game.js' );

    await linkModules(root);

    const cp = check( root );
    cp.stderr?.on( 'data', (buf) => webwin.webContents.send('error', buf.toString()) );
    cp.stdout?.on( 'data', (buf) => webwin.webContents.send('log', buf.toString()) );
    cp.on('error', (err) => {
      webwin.webContents.send( 'error', err );
    } );

    return build( root, dest ).then( res => {
      if ( !res ) {
        return null;
      }
      if ( res.errors.length > 0 ) {
        res.errors.map( err => webwin.webContents.send( 'error', err ) );
      }
      if ( res.warnings.length > 0 ) {
        res.warnings.map( warn => webwin.webContents.send( 'info', `Warning: ${warn}` ) );
      }
      return res.errors.length > 0 ? null : dest;
    });
  });
});

ipcMain.handle('bitwise-open-editor', (event, root, file) => {
  return shell.openPath(path.join(root, file));
});

const resourcesPath = path.resolve( __dirname.replace( 'app.asar', '' ), '../../..' );
ipcMain.handle('bitwise-resources-path', (event) => {
  return resourcesPath;
});

ipcMain.handle('bitwise-list-examples', async ():Promise<{name:string, path:string}[]> => {
  const resourcesPath = path.resolve(
    __dirname.replace( 'app.asar', '' ),
    app.isPackaged ? '../../..' : '../../../..',
  );
  return fs.readdir( path.join( resourcesPath, 'examples' ) )
    .then( (names) => {
      const promises = [];
      for ( const name of names ) {
        const fullPath = path.join(resourcesPath, 'examples', name);
        promises.push( fs.stat(fullPath).then( stat => ({ name, path: fullPath, stat }) ) );
      }
      return Promise.all( promises );
    })
    .then( (infos:{name:string, path:string, stat:Stats}[]) => {
      return infos.filter( i => i.stat.isDirectory() ).map( i => ({ name: i.name, path: i.path }) );
    });
});

ipcMain.handle('bitwise-release-project', async (event, root, type) => {
  if ( !win ) {
    return;
  }
  const webwin = win;

  const name = path.basename( root ) + '.' + type;
  return dialog.showSaveDialog(webwin, {
    defaultPath: path.join( root, name ),
    filters: [ { name: type, extensions: [type] } ],
    properties: [ 'createDirectory' ],
  }).then( async (res) => {
    const dest = res.filePath;
    if ( !dest ) {
      return;
    }
    const gameFile = path.join( root, '.build', 'game.js' );
    await linkModules(root);
    const buildResult = await build( root, gameFile, { sourcemap: false } );
    if ( !buildResult ) {
      return;
    }
    return release( root, type, gameFile, dest );
  });
});
