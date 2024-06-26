
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { MockElectron } from '../../../mock/electron.js';
import ElectronBackend from '../../../../src/backend/Electron.js';
import type { DirectoryItem } from '../../../../src/Backend.js';
import Project from '../../../../src/model/Project.js';
import MockGame from '../../../mock/game.js';
import { Texture, Atlas } from '@fourstar/bitwise';

jest.mock('../../../mock/game.js');

const mockReadFile = jest.fn() as jest.MockedFunction<typeof global.electron.readFile>;
const mockReadProject = jest.fn() as jest.MockedFunction<typeof global.electron.readProject>;
let backend: ElectronBackend;
let project: Project;
beforeEach(() => {
  backend = new ElectronBackend();
  project = new Project(backend, "projectName");
  global.electron = new MockElectron();
  global.electron.readFile = mockReadFile;
  global.electron.readProject = mockReadProject;
  mockReadFile.mockReset();
  mockReadProject.mockReset();
});

describe('Project', () => {
  describe('getAssets()', () => {
    test('should inflate assets from DirectoryItem', async () => {
      const dirItems: DirectoryItem[] = [
        {
          path: 'sprite.png',
        },
        {
          path: 'README.md',
        },
        {
          path: 'ui',
          children: [
            {
              path: 'button.png',
            },
          ],
        },
        {
          path: 'logs',
          children: [],
        },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      const gotAssets = await project.getAssets();
      expect(gotAssets).toHaveLength(4);
      expect(gotAssets[0]).toBeInstanceOf(Texture);
      expect(gotAssets[0].path).toBe(dirItems[0].path);
      expect(gotAssets[0].children).toBeFalsy();
      expect(gotAssets[1].path).toBe(dirItems[1].path);
      expect(gotAssets[1].children).toBeFalsy();
      expect(gotAssets[2].path).toBe(dirItems[2].path);
      expect(gotAssets[2].children?.[0]).toBeInstanceOf(Texture);
      expect(gotAssets[2].children?.[0].path).toBe(dirItems[2].children?.[0].path);
      expect(gotAssets[3].path).toBe(dirItems[3].path);
      expect(gotAssets[3].children).toHaveLength(0);
      expect(project.assets).toEqual(gotAssets);
    });

    test('should set properties for Texture items', async () => {
      const dirItems: DirectoryItem[] = [
        {
          path: 'image.png',
        },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      const gotAssets = await project.getAssets();
      expect(gotAssets).toHaveLength(1);
      const texture = gotAssets[0] as Texture;
      expect(texture).toBeInstanceOf(Texture);
      expect(texture.x).toBe(0);
      expect(texture.y).toBe(0);
      expect(texture.width).toBeNull();
      expect(texture.height).toBeNull();
      expect(project.assets).toEqual(gotAssets);
    });

    test('should open JSON files to find type info', async () => {
      const dirItems: DirectoryItem[] = [
        {
          path: 'scene.json',
        },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      // The JSON data for .json files in dirItems, in order
      const itemData: any[] = [
        { "component": "SceneEdit" },
      ];
      itemData.map(data => JSON.stringify(data)).forEach(json => mockReadFile.mockResolvedValue(json));

      const gotAssets = await project.getAssets();
      expect(gotAssets).toHaveLength(1);
      expect(gotAssets[0].path).toBe(dirItems[0].path);
      expect(project.assets).toEqual(gotAssets);
    });

    test('should descend into directories', async () => {
      const dirItems: DirectoryItem[] = [
        {
          path: 'images',
          children: [
            {
              path: 'images/sprite.png',
            },
          ],
        },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      const gotAssets = await project.getAssets();
      expect(gotAssets).toHaveLength(1);
      expect(gotAssets[0].path).toBe(dirItems[0].path);
      expect(gotAssets[0].children).toHaveLength(1);
      expect(gotAssets[0].children?.[0]).toBeInstanceOf(Texture);
      expect(gotAssets[0].children?.[0].path).toBe(dirItems[0].children?.[0].path);
      expect(project.assets).toEqual(gotAssets);
    });

    test('should read image atlas files to build item', async () => {
      const dirItems: DirectoryItem[] = [
        {
          path: 'atlas.xml',
        },
        {
          path: 'sprite.png',
        },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      // The data for files in dirItems that will be read, in order
      const itemData: any[] = [
        `<TextureAtlas imagePath="sprite.png">
          <SubTexture name="texture_01.png" x="0" y="0" width="10" height="10"/>
          <SubTexture name="texture_02.png" x="20" y="20" width="10" height="10"/>
        </TextureAtlas>
        `,
      ];
      itemData.forEach(data => mockReadFile.mockResolvedValue(data));

      const gotAssets = await project.getAssets();
      expect(gotAssets).toHaveLength(2);
      expect(gotAssets[0].path).toBe(dirItems[0].path);
      expect(gotAssets[0]).toBeInstanceOf(Atlas);
      expect(gotAssets[0].children).toHaveLength(2);
      expect(gotAssets[0].children?.[0]).toBeInstanceOf(Texture);
      expect(gotAssets[0].children?.[0].path).toBe("atlas.xml/texture_01.png");
      expect((gotAssets[0].children?.[0] as Texture).src).toBe("sprite.png");
      expect(gotAssets[0].children?.[1]).toBeInstanceOf(Texture);
      expect(gotAssets[0].children?.[1].path).toBe("atlas.xml/texture_02.png");
      expect((gotAssets[0].children?.[1] as Texture).src).toBe("sprite.png");
      expect(project.assets).toEqual(gotAssets);
    });

  });

  describe.skip('loadGameClass()', () => {
    // XXX: Skipped because the dynamic import does not work in
    // node/Jest
    const mockBuildProject = jest.fn() as jest.MockedFunction<typeof global.electron.buildProject>;
    beforeEach(() => {
      global.electron.buildProject = mockBuildProject;
      mockBuildProject.mockReset();
    });

    test('should load game class', async () => {
      mockBuildProject.mockResolvedValue('../../../mock/game.js');
      const gameClass = await project.loadGameClass();
      expect(gameClass).toBeInstanceOf(typeof MockGame);
    });

    test.todo('should emit loadstart/loadend events');
    test.todo('should reload game class after backend build');
    test.todo('should return same class to multiple concurrent callers');
  });

  describe('subscribes to backend change events', () => {
    const mockHasFocus = jest.spyOn(document, 'hasFocus');
    beforeEach(() => {
      mockHasFocus.mockReset();
      mockHasFocus.mockReturnValue(true);
    });

    test('change causes asset cache reset', async () => {
      const dirItems: DirectoryItem[] = [
        { path: 'sprite.png' },
      ];
      mockReadProject.mockResolvedValue(dirItems);

      const initialAssets = await project.getAssets();
      expect(initialAssets).toHaveLength(dirItems.length);

      const newItems = [{ path: 'newimage.png' }];
      dirItems.push(...newItems);
      backend.emit('change', newItems);

      const newAssets = await project.getAssets();
      expect(newAssets).toHaveLength(dirItems.length);
      expect(newAssets[newAssets.length - 1]).toMatchObject({ name: newItems[0].path });
    });
  });
});
