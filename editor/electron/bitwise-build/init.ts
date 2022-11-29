
// XXX: This should eventually be in its own package so we can build
// a CLI tool

import * as path from 'path';
import { promises as fs } from 'node:fs';

export async function init( projectRoot:string ) {
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

