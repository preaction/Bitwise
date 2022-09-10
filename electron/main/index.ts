import * as fs from 'node:fs/promises';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron'
import { release } from 'os'
import * as path from 'path'

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
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

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
  return dialog.showOpenDialog(win, {
    filters: [],
    properties: [ 'openDirectory', 'createDirectory' ],
  });
});

ipcMain.handle('bitwise-new-project', event => {
  return dialog.showSaveDialog(win, {
    defaultPath: 'New Project',
    filters: [],
    properties: [ 'createDirectory' ],
  })
  .then(
    (res) => {
      if ( res.filePath ) {
        // XXX: What to do if directory exists?
        return fs.mkdir(res.filePath).then(() => res);
      }
      return res
    },
  );
});

async function descend( path:string ) {
  return fs.readdir(path, { withFileTypes: true })
  .then( async (paths) => {
    return Promise.all(
      paths.filter( p => !p.name.match(/^\./) ).map( async p => {
        const item = {
          name: p.name,
        };
        if ( p.isDirectory() ) {
          item.children = await descend( path + '/' + p.name );
        }
        return item;
      })
    );
  });
}

ipcMain.handle('bitwise-read-project', (event, path) => {
  return descend(path);
});

// Register a protocol to allow reading files from the project root
app.whenReady().then(() => {
  protocol.registerFileProtocol('bfile', (request, callback) => {
    const url = request.url.substr(8);
    callback({ path: path.normalize(`${url}`) });
  })
})
