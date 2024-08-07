
import * as path from 'node:path';
import { promises as fs, Dirent } from 'node:fs';
import archiver from 'archiver';

const defaultGameConfig = {
  renderer: {
    width: 1280,
    height: 720,
    pixelScale: 128,
  },
};

export async function release(root: string, type: string, gameFile: string, dest: string): Promise<any> {
  if (type === "zip") {
    return releaseZip(root, gameFile, dest);
  }
  throw `Unknown release type ${type}`;
}

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent: Dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function releaseZip(root: string, gameFilePath: string, dest: string): Promise<any> {
  const bitwiseConfigJson = await fs.readFile(path.join(root, 'bitwise.json'), "utf-8");
  const bitwiseConfig = JSON.parse(bitwiseConfigJson);
  const initialScene = bitwiseConfig.release.zip.scene;
  const gameConfig = bitwiseConfig.game;

  const outfile = await fs.open(dest, 'w');
  const output = outfile.createWriteStream();
  const archive = archiver('zip', {});
  archive.pipe(output);

  // Build index.html that starts the game's main scene
  const index = Buffer.from(`<!DOCTYPE html>
<html>
  <head>
    <style>
      html, body {
        min-height: 100%;
        margin: 0;
        background: black;
      }
      #container {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      canvas {
        object-fit: contain;
        max-height: 100%;
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="container">
      <canvas id="game"></canvas>
    </div>
    <script type="module">
      import Game from './${path.relative(root, gameFilePath)}';
      const game = window.game = new Game({
        canvas: document.getElementById('game'),
        loader: {
          base: '',
        },
        renderer: ${JSON.stringify(gameConfig.renderer)},
        scene: '${initialScene}',
      });
      game.start();
    </script>
  </body>
</html>`);

  return new Promise(async (resolve, reject) => {
    output.on('close', function() {
      resolve(true);
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      output.close();
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        // log warning
        console.log(`Warning: ${err}`);
      }
      else {
        // throw error
        reject(err);
      }
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      reject(err);
    });

    // Add code file
    const gameFile = await fs.open(gameFilePath, "r");
    const gameStream = gameFile.createReadStream();
    archive.append(gameStream, { name: path.relative(root, gameFilePath) });

    // Add all non-code files
    const allFiles = await getFiles(root);
    for (const file of allFiles) {
      // All code has already been bundled up into the gameFile
      if (file.match(/[.](?:[tj]s|vue|js\.map)$|\/node_modules\/?/)) {
        continue;
      }
      // And we don't need these metadata files either...
      if (file.match(/(?:package(-lock)?|bitwise|tsconfig).json$/)) {
        continue;
      }
      // Or these OS-specific files
      if (file.match(/(?:\.DS_Store)$/)) {
        continue;
      }
      const fh = await fs.open(file, "r");
      const inStream = fh.createReadStream();
      archive.append(inStream, { name: path.relative(root, file) });
    }

    archive.append(index, { name: 'index.html' });
    archive.finalize();
  });
}

