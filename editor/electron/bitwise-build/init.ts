
// XXX: This should eventually be in its own package so we can build
// a CLI tool

import * as path from 'path';
import { promises as fs } from 'node:fs';
import Debug from 'debug';
const debug = Debug('bitwise:build');

export async function init(projectRoot: string) {
  debug("Initializing new project in %s", projectRoot);
  const pkgconfig = buildPackageJson();
  const pkgPath = path.join(projectRoot, 'package.json');
  await fs.writeFile(pkgPath, JSON.stringify(pkgconfig, null, 2));
  const tsconfig = buildTsconfig();
  const confPath = path.join(projectRoot, 'tsconfig.json');
  await fs.writeFile(confPath, JSON.stringify(tsconfig, null, 2));
}

function buildPackageJson() {
  return {
    "devDependencies": {
      "@types/three": "^0.146.0",
      "typescript": "^5.4.5"
    },
    "dependencies": {
      "@fourstar/bitwise": "0.5.2",
      "tslib": "^2.4.1",
      "ammojs-typed": "^1.0.6",
      "bitecs": "^0.3.38",
      "three": "^0.146.0"
    }
  };
}

function buildTsconfig() {
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
    "include": ["**/*"]
  }
}

