
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as child_process from 'node:child_process';
import { promisify } from 'node:util';
import { init } from '../../../electron/bitwise-build/init.js';
import * as bitwise from '../../../electron/bitwise-build/build.js';
const exec = promisify(child_process.exec);

jest.setTimeout(10000);

const projectRoot = path.normalize(path.join(__dirname, '..', '..', '..', '..'));
let buildDir: string, gameFilePath: string, gameConfFile: string;
beforeEach(async () => {
  buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bitwise-build-'));
  await init(buildDir);
  gameFilePath = path.join(buildDir, '.bitwise.bundle.js');
  gameConfFile = path.join(buildDir, 'bitwise.json');
  await fs.writeFile(gameConfFile, '{}');
  const packageConf = {
    "devDependencies": {
      "@types/three": "file:" + path.join(projectRoot, 'editor', 'node_modules', '@types', 'three'),
      "typescript": "file:" + path.join(projectRoot, 'editor', 'node_modules', 'typescript'),
    },
    "dependencies": {
      "@fourstar/bitwise": "file:" + path.join(projectRoot, 'game'),
      "tslib": "file:" + path.join(projectRoot, 'editor', 'node_modules', 'tslib'),
      "ammojs-typed": "file:" + path.join(projectRoot, 'editor', 'node_modules', 'ammojs-typed'),
      "bitecs": "file:" + path.join(projectRoot, 'editor', 'node_modules', 'bitecs'),
      "three": "file:" + path.join(projectRoot, 'editor', 'node_modules', 'three'),
    }
  };
  const packageConfFile = path.join(buildDir, 'package.json');
  await fs.writeFile(packageConfFile, JSON.stringify(packageConf));
  await exec('npm install', { cwd: buildDir });
});

describe('build', () => {
  describe('context', () => {
    let context: bitwise.BuildContext | undefined;
    afterEach(() => {
      if (context) {
        context.dispose()
      }
    });

    test('context initializes', async () => {
      context = await bitwise.context(buildDir, gameFilePath);
      await expect(fs.stat(gameFilePath)).rejects.toBeTruthy();
    });

    test('context rebuilds game', async () => {
      context = await bitwise.context(buildDir, gameFilePath);
      if (!context) {
        throw "Failed to build context";
      }
      const result = await context.rebuild();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      await expect(fs.stat(gameFilePath)).resolves.toBeTruthy();
    });

    test('context rebuilds with new components', async () => {
      context = await bitwise.context(buildDir, gameFilePath);
      if (!context) {
        throw "Failed to build context";
      }
      await fs.writeFile(path.join(buildDir, 'Box.ts'), 'import { Component } from "@fourstar/bitwise"; export default class Box extends Component {}');
      const result = await context.rebuild();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      await expect(fs.stat(gameFilePath)).resolves.toBeTruthy();
      await expect(fs.readFile(gameFilePath, { encoding: 'utf8' })).resolves.toMatch(/Box\.ts/);
    });

  });
});
