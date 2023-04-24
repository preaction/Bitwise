import { Stats, promises as fs } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron'
import { fork, ChildProcess } from 'node:child_process';
import * as os from 'os'
import * as path from 'path'
import { init } from './bitwise-build/init';
import * as bitwise from './bitwise-build/build';
import type { BuildContext, BuildResult } from './bitwise-build/build';
import { release } from './bitwise-build/release';

// Initialize electron-store
import Store from 'electron-store'
const appStore = new Store({ name: 'app' });
ipcMain.on('electron-store-get', async (event, file, val, def) => {
  event.returnValue = appStore.get(val, def);
});
ipcMain.on('electron-store-set', async (event, file, key, val) => {
  appStore.set(key, val);
});

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Allow "test" NODE_ENV to run as many times as it wants
if ( (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development' ) && !app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

export const ROOT_PATH = {
  // /dist
  dist: path.join(__dirname, '../dist'),
  // /dist or /public
  public: path.join(__dirname, app.isPackaged ? '../dist' : '../dist/public'),
}

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = path.join(__dirname, './preload.js')
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const url = process.env['VITE_DEV_SERVER_URL']
const indexHtml = path.join(ROOT_PATH.dist, 'index.html')

type WindowConfig = {
  x?: number,
  y?: number,
  width: number,
  height: number,
  maximize: boolean,
}
async function createWindow() {
  // Read window config
  const winConfig:WindowConfig = appStore.get( 'window', {
    width: 1024,
    height: 768,
    maximize: false,
  } ) as WindowConfig;

  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(ROOT_PATH.public, 'favicon.ico'),
    ...winConfig,
    webPreferences: {
      preload,
    },
  })
  if ( winConfig.maximize ) {
    if ( win.isFullScreenable() ) {
      win.setFullScreen(true);
    }
    else {
      win.maximize();
    }
  }
  win.on('close', () => {
    Object.assign( winConfig, { maximize: win?.isMaximized() }, win?.getNormalBounds() );
    appStore.set( 'window', winConfig );
  });

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
          return init(projectRoot);
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
  const mywin = win;
  if ( aborter ) {
    aborter.abort();
  }
  aborter = new AbortController();

  const watcher = fs.watch( path, { signal: aborter.signal, recursive: true, persistent: false } );
  (async () => {
    try {
      const changes:{eventType: string, filename:string}[] = [];
      let timeoutId;
      for await (const event of watcher) {
        changes.push( event );
        if ( timeoutId ) {
          clearTimeout( timeoutId );
        }
        timeoutId = setTimeout( () => {
          mywin.webContents.send( 'watch', changes );
          changes.length = 0;
          timeoutId = null;
        }, 2000);
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
    callback({ path: path.normalize(`${decodeURIComponent(url)}`) });
  })
})

ipcMain.handle('bitwise-new-file', ( event, root, name, ext ) => {
  if ( !win ) {
    return;
  }
  return dialog.showSaveDialog(win, {
    defaultPath: path.join( root, name ),
    filters: [ { name: ext, extensions: [ext] } ],
    properties: [ 'createDirectory' ],
  })
  .then(
    (res) => {
      if ( res.filePath && !res.filePath.match( "\\." + ext + "$" ) ) {
        res.filePath += '.' + ext;
      }
      return res
    },
  );
});

ipcMain.handle('bitwise-save-file', (event, root, item, data) => {
  // XXX: Write to new file then rename to avoid losing data
  return fs.writeFile( path.join(root, item), data );
});

ipcMain.handle('bitwise-read-file', (event, root, item) => {
  return fs.readFile( path.join(root, item), { encoding: 'utf8' } );
});

ipcMain.handle('bitwise-delete-tree', (event, root, tree) => {
  return fs.rm( path.join( root, tree ), { recursive: true } );
});

ipcMain.handle('bitwise-rename-path', (event, root, from, to) => {
  return fs.rename( path.join( root, from ), path.join( root, to ) );
});

ipcMain.handle('bitwise-import-files', (event, root) => {
  if ( !win ) {
    return;
  }
  return dialog.showOpenDialog(win, {
    filters: [],
    properties: [ 'openDirectory' ],
  })
  .then( async (res) => {
    const promises = [];
    for ( const src of res.filePaths ) {
      // If path is a directory, copy to a new directory with the same
      // name in the root
      const stat = await fs.stat( src );
      let dest = root;
      if ( stat.isDirectory() ) {
        dest = path.join( dest, path.basename( src ) );
      }
      promises.push( fs.cp( src, dest, { recursive: true } ) );
    }
    return Promise.all(promises);
  });
});

async function linkModules( root:string ) {
  // Make sure the project has all necessary dependencies linked in,
  // because Ammo breaks completely if it is loaded more than once,
  // and Three complains.
  // We do "npm link --force" to make absolutely sure that the game and
  // the framework rely on the exact same file, so esbuild will not
  // bundle it twice.
  const modulesDir = path.resolve( __dirname.replace( 'app.asar', '' ), '../../../node_modules' );
  const dependencies:string[] = [
    '@types/three',
    'three',
    'bitecs',
    'ammojs-typed',
    'typescript',
    'tslib',
    '@fourstar/bitwise',
  ];
  const p = new Promise( (resolve, reject) => {
    const cp = fork(
      require.resolve("npm"),
      [ "link", "--force", ...dependencies.map( dep => path.join( modulesDir, dep ) ) ],
      {
        cwd: root,
      },
    );
    cp.on( 'exit', resolve );
    cp.on( 'error', reject );
  } );
  await p;
}

let context:BuildContext|undefined;
let contextDest = '';
let contextRoot = '';
ipcMain.handle('bitwise-build-project', async (event, root) => {
  if ( !win ) {
    return;
  }
  performance.clearMarks('buildStart');
  performance.mark('buildStart');
  const webwin = win;
  if ( !context || contextRoot != root ) {
    await fs.mkdtemp( path.join(os.tmpdir(), 'bitwise-') ).then( async destDir => {
      const dest = path.join( destDir, 'game.js' );
      await linkModules(root);
      context = await bitwise.context(root, dest);
      contextDest = dest;
      contextRoot = root;
    });
  }

  const cp = await bitwise.check( root );
  cp.stderr?.on( 'data', (buf) => webwin.webContents.send('error', buf.toString()) );
  cp.stdout?.on( 'data', (buf) => webwin.webContents.send('log', buf.toString()) );
  cp.on('error', (err) => {
    webwin.webContents.send( 'error', err );
  } );

  if ( !context ) {
    webwin.webContents.send( 'error', 'Could not create build context' );
    return;
  }

  return context.rebuild().then( (res:bitwise.BuildResult) => {
    performance.measure('buildTime', 'buildStart');
    if ( !res ) {
      return null;
    }
    if ( res.errors?.length > 0 ) {
      res.errors.map( err => webwin.webContents.send( 'error', err ) );
    }
    if ( res.warnings?.length > 0 ) {
      res.warnings.map( warn => webwin.webContents.send( 'info', `Warning: ${warn}` ) );
    }
    const perfEntries = performance.getEntriesByName('buildTime');
    console.log( perfEntries[ perfEntries.length - 1 ] );
    webwin.webContents.send( 'info', perfEntries[ perfEntries.length - 1 ] );
    performance.clearMeasures('buildTime');
    return res.errors?.length > 0 ? null : contextDest;
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
    app.isPackaged ? '../..' : '../../..',
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
    const buildResult = await bitwise.build( root, gameFile, { sourcemap: false } );
    if ( !buildResult ) {
      return;
    }
    return release( root, type, gameFile, dest );
  });
});
