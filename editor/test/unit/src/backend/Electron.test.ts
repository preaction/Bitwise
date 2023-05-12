
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { MockElectron } from '../../../mock/electron.js';
import ElectronBackend from '../../../../src/backend/Electron.js';
import type { DirectoryItem } from '../../../../src/Backend.js';
import Project from '../../../../src/model/Project.js';

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
      expect(result).toEqual(givenProjects);
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

    test( 'should return project object', async () => {
      const backend = new ElectronBackend();
      const projectName = "newProject";
      const project = await backend.openProject(projectName);
      expect(project).toBeInstanceOf(Project);
      expect(project.name).toBe(projectName);
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
        {
          path: 'ui',
          children: [
            {
              path: 'button.png',
            },
          ],
        },
      ];
      mockReadProject.mockResolvedValue( dirItems );

      const backend = new ElectronBackend();
      const gotItems = await backend.listItems( "project" );
      expect(mockReadProject).toHaveBeenCalledWith("project");
      expect(gotItems).toHaveLength(3);
      expect(gotItems[0].path).toBe(dirItems[0].path);
      expect(gotItems[1].path).toBe(dirItems[1].path);
      expect(gotItems[2].path).toBe(dirItems[2].path);
      expect(gotItems[2].children?.[0].path).toBe(dirItems[2].children?.[0].path);
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
      expect(gotItems[0].children).toHaveLength(1);
      expect(gotItems[0].children?.[0].path).toBe(dirItems[0].children?.[0].path);
    } );
  });

  describe( 'readItemData()', () => {
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
      const gotData = await backend.readItemData( "project", "item.json" );
      expect(mockReadFile).toHaveBeenCalledWith("project", "item.json");
      expect(gotData).toBe( itemData[0]);
    });
  });

  describe( 'writeItemData()', () => {
    const mockSaveFile = jest.fn() as jest.MockedFunction<typeof global.electron.saveFile>;
    beforeEach( () => {
      global.electron.saveFile = mockSaveFile;
      mockSaveFile.mockReset();
    } );

    test( 'should write item data', async () => {
      const backend = new ElectronBackend();
      await backend.writeItemData( "project", "item.json", "data" );
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

  describe( 'saveProject()', () => {
    const mockSaveFile = jest.fn() as jest.MockedFunction<typeof global.electron.saveFile>;
    beforeEach( () => {
      global.electron.saveFile = mockSaveFile;
      mockSaveFile.mockReset();
    } );

    test( 'should write bitwise.json', async () => {
      const backend = new ElectronBackend();
      const project = new Project( backend, "newProject" );
      await backend.saveProject( project );
      expect( mockSaveFile ).toHaveBeenCalledWith( "newProject", "bitwise.json", "{}" );
    } );
  });

  describe( 'buildProject()', () => {
    const mockBuildProject = jest.fn() as jest.MockedFunction<typeof global.electron.buildProject>;
    beforeEach( () => {
      global.electron.buildProject = mockBuildProject;
      mockBuildProject.mockReset();
    } );

    test( 'should build project', async () => {
      const backend = new ElectronBackend();
      await backend.buildProject( "buildProject" );
      expect( mockBuildProject ).toHaveBeenCalledWith( "buildProject" );
    } );

    test( 'should emit buildstart and buildend events', async () => {
      mockBuildProject.mockResolvedValueOnce("GameFile.js");
      const backend = new ElectronBackend();
      const buildStart = jest.fn();
      const buildEnd = jest.fn();
      backend.on( 'buildstart', buildStart );
      backend.on( 'buildend', buildEnd );
      await backend.buildProject( "buildProject" );
      expect( buildStart ).toHaveBeenCalled();
      expect( buildEnd ).toHaveBeenCalledWith( "GameFile.js" );
    } );
  });

  describe( 'releaseProject()', () => {
    const mockReleaseProject = jest.fn() as jest.MockedFunction<typeof global.electron.releaseProject>;
    beforeEach( () => {
      global.electron.releaseProject = mockReleaseProject;
      mockReleaseProject.mockReset();
    } );

    test( 'should release project', async () => {
      const backend = new ElectronBackend();
      await backend.releaseProject( "releaseProject", "zip" );
      expect( mockReleaseProject ).toHaveBeenCalledWith( "releaseProject", "zip" );
    } );
  });

  describe( 'getState()', () => {
    const expectState = { key: "value" };
    const mockStoreGet = jest.fn() as jest.MockedFunction<typeof global.electron.store.get>;
    beforeEach( () => {
      global.electron.store.get = mockStoreGet;
      mockStoreGet.mockReset();
      mockStoreGet.mockReturnValue( new Promise( (resolve) => resolve(expectState) ) );
    } );

    test( 'should read state', async () => {
      const backend = new ElectronBackend();
      const defaultValue = {};
      const gotState = await backend.getState( "localState", defaultValue );
      expect( gotState ).toEqual( expectState );
      expect( mockStoreGet ).toHaveBeenCalledWith( "app", "localState", defaultValue );
    } );
  });

  describe( 'setState()', () => {
    const mockStoreSet = jest.fn() as jest.MockedFunction<typeof global.electron.store.set>;
    beforeEach( () => {
      global.electron.store.set = mockStoreSet;
      mockStoreSet.mockReset();
      mockStoreSet.mockReturnValue();
    } );

    test( 'should read state', async () => {
      const expectState = { key: "value" };
      const backend = new ElectronBackend();
      await backend.setState( "localState", expectState );
      expect( mockStoreSet ).toHaveBeenCalledWith( "app", "localState", expectState );
    } );
  });
});
