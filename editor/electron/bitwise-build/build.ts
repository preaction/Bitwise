
// XXX: This should eventually be in its own package so we can build
// a CLI tool

import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import * as esbuild from 'esbuild';
import { fork, ChildProcess } from 'node:child_process';

type GameConfig = {};

export async function build( root:string, dest:string, opt:{ [key:string]:any }={} ):Promise<esbuild.BuildResult|undefined> {
  const src = await buildGameFile(root);
  if ( !src ) {
    return;
  }
  return esbuild.build({
    bundle: true,
    define: { Ammo: '{ "ENVIRONMENT": "WEB" }' },
    external: [
      // Ammo.js can run in Node, but esbuild tries to resolve these
      // Node modules even if we are going to run in the browser.
      'fs', 'path',
    ],
    absWorkingDir: root,
    entryPoints: [src],
    outfile: dest,
    outbase: root,
    format: 'esm',
    sourcemap: true,
    logLevel: 'info',
    logLimit: 0,
    ...opt,
  });
}

export function check(root:string):ChildProcess {
  // Check for typescript errors
  const tsc = path.resolve( root, 'node_modules/typescript/bin/tsc' );
  const cp = fork( tsc, [ '--noEmit' ], {
    cwd: root,
    stdio: 'overlapped',
  } );
  return cp;
}

async function buildGameFile( projectRoot:string ):Promise<string|undefined> {
  const findModules:((dir:string) => Promise<{name: string, path:string}[]>) = async (dir) => {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents
        .filter( dirent => !(dirent.name.match(/^\./) || dirent.name === "node_modules") )
        .map( dirent => {
          const res = { name: dirent.name, path: path.join(dir, dirent.name) };
          return dirent.isDirectory() ? findModules(res.path) : dirent.name.match(/\.[tj]s$/) ? res : null;
        })
    );
    return files.flat().filter( f => f !== null ) as {name: string, path:string}[];
  }

  const modules = await findModules( projectRoot );
  const confPath = path.join( projectRoot, 'bitwise.json' );
  let gameConf = {};
  try {
    const confJson = await fs.readFile( confPath, { encoding: 'utf8' } );
    gameConf = JSON.parse(confJson);
  }
  catch (e) {
    console.warn( `Could not read project config: ${e}` );
  }

  const gameJs = buildGameJs( projectRoot, gameConf, modules );
  // The game file must be written to the root of the project
  // directory for `import` directives to work correctly.
  const gamePath = path.join( projectRoot, '.bitwise.js' );
  return fs.writeFile( gamePath, gameJs ).then( () => gamePath );
};

function buildGameJs(projectRoot:string, config:GameConfig, moduleItems:{name:string,path:string}[]) {
  // We only know plugins, not whether they are components or systems,
  // so we have to load them all and figure out which is what later...
  const imports: { [key:string]: { stmt: string, name: string } } = {};
  for ( const item of moduleItems ) {
    let varname = item.name.replace( /\.[tj]s$/, '');
    if ( imports[ varname ] ) {
      let idx = 1;
      while ( imports[ varname + idx ] ) {
        idx++;
      }
      varname = varname + idx;
    }
    imports[varname] = {
      stmt: `import ${varname} from './${path.relative(projectRoot, item.path)}';`,
      name: item.name.replace( /\.[tj]s$/, '' ),
    };
  }

  const gameFile = `
    import { Game, System, Component } from '@fourstar/bitwise';

    // Import custom components and systems
    ${Object.keys(imports).sort().map( k => imports[k].stmt ).join("\n")}
    const mods = [ ${Object.keys(imports).sort().join(', ')} ];
    const modNames = [ ${Object.keys(imports).sort().map( k => `"${imports[k].name}"` ).join(', ')} ];

    const config = ${JSON.stringify( config, null, 2 )};
    config.components = {};
    config.systems = {};

    mods.forEach( (p, i) => {
      const name = modNames[i];
      if ( p.prototype instanceof Component ) {
        config.components[name] = p;
      }
      else if ( p.prototype instanceof System ) {
        config.systems[name] = p;
      }
      else {
        throw \`Unknown plugin: ${"${name}"}\`;
      }
    } );

    export default class MyGame extends Game {
      get config() {
        return config;
      }
    };
  `;

  return gameFile.replaceAll(/\n {4}/g, "\n");
}

