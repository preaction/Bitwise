
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { MockElectron } from '../../../mock/electron.js';
import ElectronBackend from '../../../../src/backend/Electron.js';
import Project from '../../../../src/Project.js';

beforeEach( () => {
  global.electron = new MockElectron();
});

describe( 'backend/Electron', () => {
  describe( 'listProjects()', () => {
    const givenProjects = [ "projectOne", "games/projectTwo" ];
    const mockGetStore = jest.fn() as jest.MockedFunction<typeof global.electron.store.get>;
    mockGetStore.mockReturnValue( givenProjects );

    beforeEach( () => {
      global.electron.store.get = mockGetStore;
      mockGetStore.mockClear();
    } );

    test( 'should list recent projects', async () => {
      const backend = new ElectronBackend();
      const result = await backend.listProjects();
      expect(result).toHaveLength(2);
      result.forEach( (_, i) => {
        expect(result[i]).toBeInstanceOf(Project);
      });
      expect(result[0].name).toBe(givenProjects[0]);
      expect(result[1].name).toBe(givenProjects[1]);
    } );
  });

  describe( 'openProject()', () => {
    const givenProjects = [ "projectOne", "games/projectTwo" ];
    const mockGetStore = jest.fn() as jest.MockedFunction<typeof global.electron.store.get>;
    const mockSetStore = jest.fn() as jest.MockedFunction<typeof global.electron.store.set>;

    beforeEach( () => {
      global.electron.store.get = mockGetStore;
      global.electron.store.set = mockSetStore;
      mockGetStore.mockReset();
      mockGetStore.mockReturnValue( [...givenProjects] );
      mockSetStore.mockClear();
    } );

    test( 'should append new projects to recent projects', async () => {
      const backend = new ElectronBackend();
      await backend.openProject( "newProject" );
      expect(mockGetStore).toHaveBeenCalled();
      expect(mockSetStore).toHaveBeenCalled();
      expect(mockSetStore).lastCalledWith(
        mockGetStore.mock.calls[0][0],
        mockGetStore.mock.calls[0][1],
        [ "newProject", ...givenProjects ],
      );
    } );
    test( 'should reorder existing projects in recent projects', async () => {
      const backend = new ElectronBackend();
      await backend.openProject( givenProjects[1] );
      expect(mockGetStore).toHaveBeenCalled();
      expect(mockSetStore).toHaveBeenCalled();
      expect(mockSetStore).lastCalledWith(
        mockGetStore.mock.calls[0][0],
        mockGetStore.mock.calls[0][1],
        [ givenProjects[1], givenProjects[0] ],
      );
    } );
  });

  describe( 'listItems()', () => {
    const mockReadProject = jest.fn() as jest.MockedFunction<typeof global.electron.readProject>;
    const mockReadFile = jest.fn() as jest.MockedFunction<typeof global.electron.readFile>;
    beforeEach( () => {
      global.electron.readProject = mockReadProject;
      mockReadProject.mockReset();
      global.electron.readFile = mockReadFile;
      mockReadFile.mockReset();
    } );

    test('should list project items', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'sprite.png',
        },
        {
          path: 'README.md',
        },
      ];
      mockReadProject.mockReturnValue(
        new Promise( (resolve) => resolve(dirItems) ),
      );

      const backend = new ElectronBackend();
      const gotItems = await backend.listItems( "project" );
      expect(mockReadProject).toHaveBeenCalledWith("project");
      expect(gotItems).toHaveLength(2);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe("image");
      expect(gotItems[1].path).toBe(dirItems[1].path);
      expect(gotItems[1].type).toBe("markdown");
    } );

    test( 'should open JSON files to find type info', async () => {
      const dirItems:DirectoryItem[] = [
        {
          path: 'scene.json',
        },
      ];
      mockReadProject.mockReturnValue(
        new Promise( (resolve) => resolve(dirItems) ),
      );

      // The JSON data for .json files in dirItems, in order
      const itemData:any[] = [
        { "component": "SceneEdit" },
      ];
      itemData.forEach( data => {
        mockReadFile.mockReturnValue(
          new Promise( (resolve) => resolve(JSON.stringify(data)) ),
        );
      });

      const backend = new ElectronBackend();
      const gotItems = await backend.listItems( "project" );
      expect(mockReadProject).toHaveBeenCalledWith("project");
      expect(gotItems).toHaveLength(1);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe(itemData[0].component);
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
      mockReadProject.mockReturnValue(
        new Promise( (resolve) => resolve(dirItems) ),
      );

      const backend = new ElectronBackend();
      const gotItems = await backend.listItems( "project" );
      expect(mockReadProject).toHaveBeenCalledWith("project");
      expect(gotItems).toHaveLength(1);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[0].type).toBe("directory");
      expect(gotItems[0].children).toHaveLength(1);
      expect(gotItems[0].children[0].path).toBe(dirItems[0].children?.[0].path);
      expect(gotItems[0].children[0].type).toBe("image");
    } );
  });

  describe( 'readItem()', () => {
    const mockReadFile = jest.fn() as jest.MockedFunction<typeof global.electron.readFile>;
    beforeEach( () => {
      global.electron.readFile = mockReadFile;
      mockReadFile.mockReset();
    } );
    test( 'should read item data', async () => {
      const itemData:any[] = [
        `{ "component": "SceneEdit" }`,
      ];
      itemData.forEach( data => {
        mockReadFile.mockReturnValue(
          new Promise( (resolve) => resolve(data) ),
        );
      });

      const backend = new ElectronBackend();
      const gotData = await backend.readItem( "project", "item.json" );
      expect(mockReadFile).toHaveBeenCalledWith("project", "item.json");
      expect(gotData).toBe( itemData[0]);
    });
  });

  describe( 'writeItem()', () => {
    const mockSaveFile = jest.fn() as jest.MockedFunction<typeof global.electron.saveFile>;
    beforeEach( () => {
      global.electron.saveFile = mockSaveFile;
      mockSaveFile.mockReset();
    } );

    test( 'should write item data', async () => {
      const backend = new ElectronBackend();
      await backend.writeItem( "project", "item.json", "data" );
      expect(mockSaveFile).toHaveBeenCalledWith("project", "item.json", "data");
    });
  });

  describe( 'deleteItem()', () => {
    const mockDeleteTree = jest.fn() as jest.MockedFunction<typeof global.electron.deleteTree>;
    beforeEach( () => {
      global.electron.deleteTree = mockDeleteTree;
      mockDeleteTree.mockReset();
    } );

    test( 'should delete item', async () => {
      const backend = new ElectronBackend();
      await backend.deleteItem( "project", "item.json" );
      expect(mockDeleteTree).toHaveBeenCalledWith("project", "item.json");
    });
  });
});
