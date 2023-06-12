
// XXX: This should eventually be in its own package so we can build
// a CLI tool

import * as path from 'path';
import { promises as fs } from 'node:fs';
import Debug from 'debug';
const debug = Debug('bitwise:build');

export async function init( projectRoot:string ) {
  debug( "Initializing new project in %s", projectRoot );
  const tsconfig = buildTsconfig();
  const confPath = path.join( projectRoot, 'tsconfig.json' );
  return fs.writeFile( confPath, JSON.stringify(tsconfig, null, 2) );
}

async function buildTsconfig() {
  return {
    "compilerOptions": {
      "target": "ESNext",
      "module": "ESNext",
      "moduleResolution": "node",
      "importHelpers": true,
      "jsx": "preserve",
      "esModuleInterop": true,
      "resolveJsonModule": true,
      "sourceMap": true,
      "baseUrl": "./",
      "strict": true,
      "allowSyntheticDefaultImports": true,
      "skipLibCheck": true,
      "outDir": ".build",
    },
    "include": [ "**/*" ]
  }
}

