
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { MockElectron } from '../../mock/electron.js';
import { Asset, Load } from '@fourstar/bitwise';
import Project from '../../../src/model/Project.js';
import Tab from '../../../src/model/Tab.js';
import MockBackend from '../../mock/backend.js';

let backend:MockBackend, project:Project, asset:Asset;
beforeEach( () => {
  global.electron = new MockElectron();
  global.confirm = () => true;
  backend = new MockBackend();
  project = new Project(backend, "test");
  asset = new Asset(new Load(), "scene.json");
  asset.data = { component: 'SceneEdit' };
} );

describe( 'Tab', () => {
  describe( 'constructor', () => {
    test( 'should fill attributes from project item', () => {
      asset.path = "Scenes/MyScene.json";
      const tab = new Tab(project, asset);
      expect(tab.src).toBe(asset.path);
      expect(tab.name).toBe("MyScene");
      expect(tab.ext).toBe(".json");
    });
  });

  describe( 'writeFile', () => {
    const mockWriteItemData = jest.fn() as jest.MockedFunction<typeof backend.writeItemData>;
    beforeEach( () => {
      mockWriteItemData.mockClear();
      backend.writeItemData = mockWriteItemData;
    });

    test( 'should write file', async () => {
      const tab = new Tab(project, asset);
      const data = { component: "SceneEdit" };
      await tab.writeFile(JSON.stringify(data));
      expect( backend.writeItemData ).toHaveBeenCalledWith(
        project.name, asset.path, JSON.stringify(data),
      );
    });

    test( 'should create new file if no src', async () => {
      const newFilePath = "NewScene.json";
      const mockNewFile = jest.fn() as jest.MockedFunction<typeof global.electron.newFile>;
      mockNewFile.mockReturnValue(
        new Promise( (resolve) => resolve({ canceled: false, filePath: newFilePath }) ),
      );
      global.electron.newFile = mockNewFile;

      const asset = new Asset( new Load(), "" );
      asset.data = {};
      const tab = new Tab(project, asset);
      tab.ext = '.json';
      const data = { component: "SceneEdit" };
      await tab.writeFile(JSON.stringify(data));
      expect( global.electron.newFile ).toHaveBeenCalledWith(
        project.name, "", ".json",
      );
      expect( backend.writeItemData ).toHaveBeenCalledWith(
        project.name, newFilePath, JSON.stringify(data),
      );
    });

    test( 'should rename file if name is different', async () => {
      const mockDeleteItem = jest.fn() as jest.MockedFunction<typeof backend.deleteItem>;
      mockDeleteItem.mockReturnValue(
        new Promise<void>( (resolve) => resolve() ),
      );
      backend.deleteItem = mockDeleteItem;

      const asset = new Asset( new Load(), "scene/Old Scene.json" );
      const tab = new Tab(project, asset);
      tab.name = 'New Scene';
      const data = { component: "SceneEdit" };
      await tab.writeFile(JSON.stringify(data));
      expect( backend.writeItemData ).toHaveBeenCalledWith(
        project.name, "scene/New Scene.json", JSON.stringify(data),
      );
      expect( backend.deleteItem ).toHaveBeenCalledWith(
        project.name, "scene/Old Scene.json",
      );
    });
  });
});
