
import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import extract from 'extract-zip';
import type { GameConfig } from '../../../../game/dist/Game.js';
import { release } from '../../../electron/bitwise-build/release.js';

let gameDir: string, gameFilePath: string, gameConfFile: string,
  destDir: string;
beforeEach(async () => {
  gameDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bitwise-build-'));
  destDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bitwise-release-'));
  gameFilePath = path.join(gameDir, 'game.js');
  await fs.writeFile(gameFilePath, 'export default class Game {}');
  gameConfFile = path.join(gameDir, 'bitwise.json');
});

describe('release', () => {
  describe('release as zip file', () => {
    test('release uses game config', async () => {
      const gameConf: GameConfig = {
        renderer: {
          width: 1920,
          height: 1080,
        },
      };
      const bitwiseConfig = {
        release: {
          zip: {
            scene: 'initialScene',
          },
        },
        game: gameConf,
      }
      await fs.writeFile(gameConfFile, JSON.stringify(bitwiseConfig));
      const destFile = 'release.zip';
      const destPath = path.join(destDir, destFile);

      await release(gameDir, 'zip', gameFilePath, destPath);
      expect(async () => await fs.stat(destPath)).not.toThrow();

      // Extract the game
      await extract(destPath, { dir: destDir });

      // Load the game class
      const indexFilePath = path.join(destDir, 'index.html');
      const indexHtml = await fs.readFile(indexFilePath, {
        encoding: 'utf8',
      });

      // Test the game configuration
      expect(indexHtml).toMatch(`width: ${gameConf.renderer.width}`);
      expect(indexHtml).toMatch(`height: ${gameConf.renderer.height}`);
    });
  });
});
