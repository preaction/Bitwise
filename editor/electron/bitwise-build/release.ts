
import * as path from 'node:path';
import { promises as fs, Dirent } from 'node:fs';
import archiver from 'archiver';

export async function release( root:string, type:string, gameFile:string, dest:string ):Promise<any> {
  if ( type === "zip" ) {
    return releaseZip(root, gameFile, dest);
  }
  throw `Unknown release type ${type}`;
}

async function getFiles(dir:string):Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent:Dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function releaseZip( root:string, gameFile:string, dest:string ):Promise<any> {
  const gameConfigJson = await fs.readFile( path.join( root, 'bitwise.json' ), "utf-8" );
  const conf = JSON.parse( gameConfigJson );
  const initialScene = conf.release.zip.scene;

  const outfile = await fs.open(dest, 'w');
  const output = outfile.createWriteStream();
  const archive = archiver('zip', {});
  archive.pipe(output);

  // Add code file
  archive.file( gameFile, { name: path.relative( root, gameFile ) } );
  console.log( `Adding game file ${gameFile}` );

  // Add all non-code files
  const allFiles = await getFiles(root);
  for ( const file of allFiles ) {
    // All code has already been bundled up into the gameFile
    if ( file.match(/[.](?:[tj]s|vue|js\.map)$|\/node_modules\/?/) ) {
      continue;
    }
    // And we don't need these metadata files either...
    if ( file.match(/(?:package(-lock)?|bitwise|tsconfig).json$/) ) {
      continue;
    }
    archive.file(file, { name: path.relative( root, file ) });
  }

  // Build index.html that starts the game's main scene
  const index = `<!DOCTYPE html>
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
      import Game from './${path.relative( root, gameFile )}';
      const game = window.game = new Game({
        canvas: document.getElementById('game'),
        loader: {
          base: '',
        },
        // XXX: Get from game settings
        renderer: {
          width: 1280,
          height: 720,
        },
        scene: '${initialScene}',
      });
      game.start();
    </script>
  </body>
</html>`;

  archive.append( index, { name: 'index.html' } );
  return new Promise( (resolve, reject) => {
    output.on('close', function() {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      resolve(true);
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      console.log('Data has been drained');
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
    archive.finalize();
  });
}

