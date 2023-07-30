
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { MockElectron } from '../../../mock/electron.js';
import ElectronBackend from '../../../../src/backend/Electron.js';
import type { DirectoryItem } from '../../../../src/Backend.js';
import Project from '../../../../src/model/Project.js';
import MockGame from '../../../mock/game.js';
import Texture from '../../../../src/model/projectitem/Texture.js';
import Atlas from '../../../../src/model/projectitem/Atlas.js';

jest.mock('../../../mock/game.js');

beforeEach( () => {
  global.electron = new MockElectron();
});

describe( 'Project', () => {
  describe( 'inflateItems()', () => {
    const mockReadFile = jest.fn() as jest.MockedFunction<typeof global.electron.readFile>;
    beforeEach( () => {
      global.electron.readFile = mockReadFile;
      mockReadFile.mockReset();
    } );

    test('should inflate project items from DirectoryItem', async () => {
      const dirItems:DirectoryItem[] = [
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

      const backend = new ElectronBackend();
      const project = new Project(backend, "projectName");
      const gotItems = await project.inflateItems(dirItems);
      expect(gotItems).toHaveLength(4);
      expect(gotItems[0]).toBeInstanceOf(Texture);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe("texture");
      expect(gotItems[0].children).toBeFalsy();
      expect(gotItems[1].path).toBe(dirItems[1].path);
      expect(gotItems[1].type).toBe("markdown");
      expect(gotItems[1].children).toBeFalsy();
      expect(gotItems[2].path).toBe(dirItems[2].path);
      expect(gotItems[2].type).toBe("directory");
      expect(gotItems[2].children?.[0]).toBeInstanceOf(Texture);
      expect(gotItems[2].children?.[0].path).toBe(dirItems[2].children?.[0].path);
      expect(gotItems[2].children?.[0].type).toBe("texture");
      expect(gotItems[3].path).toBe(dirItems[3].path);
      expect(gotItems[3].type).toBe("directory");
      expect(gotItems[3].children).toHaveLength(0);
      expect(project.items).toEqual(gotItems);
    } );

    test( 'should set properties for Texture items', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'image.png',
        },
      ];

      const backend = new ElectronBackend();
      const project = new Project(backend, "projectName");
      const gotItems = await project.inflateItems(dirItems);
      expect(gotItems).toHaveLength(1);
      const texture = gotItems[0] as Texture;
      expect(texture).toBeInstanceOf(Texture);
      expect(texture.x).toBe(0);
      expect(texture.y).toBe(0);
      expect(texture.width).toBeNull();
      expect(texture.height).toBeNull();
      expect(project.items).toEqual(gotItems);
    });

    test( 'should open JSON files to find type info', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'scene.json',
        },
      ];

      // The JSON data for .json files in dirItems, in order
      const itemData:any[] = [
        { "component": "SceneEdit" },
      ];
      itemData.map( data => JSON.stringify(data) ).forEach( json => mockReadFile.mockResolvedValue(json) );

      const backend = new ElectronBackend();
      const project = new Project( backend, "projectName" );
      const gotItems = await project.inflateItems(dirItems);
      expect(gotItems).toHaveLength(1);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe(itemData[0].component);
      expect(project.items).toEqual(gotItems);
    } );

    test( 'should descend into directories', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'images',
          children: [
            {
              path: 'images/sprite.png',
            },
          ],
        },
      ];

      const backend = new ElectronBackend();
      const project = new Project( backend, "projectName" );
      const gotItems = await project.inflateItems(dirItems);
      expect(gotItems).toHaveLength(1);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe("directory");
      expect(gotItems[0].children).toHaveLength(1);
      expect(gotItems[0].children?.[0]).toBeInstanceOf(Texture);
      expect(gotItems[0].children?.[0].path).toBe(dirItems[0].children?.[0].path);
      expect(gotItems[0].children?.[0].type).toBe("texture");
      expect(project.items).toEqual(gotItems);
    } );

    test( 'should read image atlas files to build item', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'atlas.xml',
        },
        {
          path: 'sprite.png',
        },
      ];

      // The data for files in dirItems that will be read, in order
      const itemData:any[] = [
        `<TextureAtlas imagePath="sprite.png">
          <SubTexture name="texture_01.png" x="0" y="0" width="10" height="10"/>
          <SubTexture name="texture_02.png" x="20" y="20" width="10" height="10"/>
        </TextureAtlas>
        `,
      ];
      itemData.forEach( data => mockReadFile.mockResolvedValue( data ) );

      const backend = new ElectronBackend();
      const project = new Project( backend, "projectName" );
      const gotItems = await project.inflateItems(dirItems);
      expect(gotItems).toHaveLength(2);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe("atlas");
      expect(gotItems[0]).toBeInstanceOf(Atlas);
      expect(gotItems[0].children).toHaveLength(2);
      expect(gotItems[0].children?.[0]).toBeInstanceOf(Texture);
      expect(gotItems[0].children?.[0].path).toBe("atlas.xml/texture_01.png");
      expect((gotItems[0].children?.[0] as Texture).src).toBe("sprite.png");
      expect(gotItems[0].children?.[1]).toBeInstanceOf(Texture);
      expect(gotItems[0].children?.[1].path).toBe("atlas.xml/texture_02.png");
      expect((gotItems[0].children?.[1] as Texture).src).toBe("sprite.png");
      expect(project.items).toEqual(gotItems);
    } );

  });

  describe.skip( 'loadGameClass()', () => {
    // XXX: Skipped because the dynamic import does not work in
    // node/Jest
    const mockBuildProject = jest.fn() as jest.MockedFunction<typeof global.electron.buildProject>;
    beforeEach( () => {
      global.electron.buildProject = mockBuildProject;
      mockBuildProject.mockReset();
    } );

    test( 'should load game class', async () => {
      mockBuildProject.mockResolvedValue( '../../../mock/game.js' );
      const backend = new ElectronBackend();
      const project = new Project(backend, "projectName");
      const gameClass = await project.loadGameClass();
      expect( gameClass ).toBeInstanceOf( typeof MockGame );
    });

    test.todo( 'should emit loadstart/loadend events' );
    test.todo( 'should reload game class after backend build' );
    test.todo( 'should return same class to multiple concurrent callers' );
  } );
});
