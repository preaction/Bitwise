
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { MockElectron } from '../../mock/electron.js';
import Project from '../../../src/Project.js';
import ProjectItem from '../../../src/ProjectItem.js';
import Tab from '../../../src/Tab.js';
import MockBackend from '../../mock/backend.js';

let backend:MockBackend, project:Project, projectItem:ProjectItem;
beforeEach( () => {
  global.electron = new MockElectron();
  backend = new MockBackend();
  project = new Project(backend, "test");
  projectItem = new ProjectItem(project, "scene.json", "SceneEdit");
} );

describe( 'Tab', () => {
  describe( 'constructor', () => {
    test( 'should fill attributes from project item', () => {
      projectItem.path = "Scenes/MyScene.json";
      const tab = new Tab(projectItem);
      expect(tab.src).toBe(projectItem.path);
      expect(tab.name).toBe("MyScene");
      expect(tab.ext).toBe(".json");
    });
  });

  describe( 'writeFile', () => {
    const mockWriteItem = jest.fn() as jest.MockedFunction<typeof backend.writeItem>;
    beforeEach( () => {
      mockWriteItem.mockClear();
      backend.writeItem = mockWriteItem;
    });

    test( 'should write file', async () => {
      const tab = new Tab(projectItem);
      const data = { component: "SceneEdit" };
      await tab.writeFile(data);
      expect( backend.writeItem ).toHaveBeenCalledWith(
        project.name, projectItem.path, JSON.stringify(data),
      );
    });

    test( 'should create new file if no src', async () => {
      const newFilePath = "NewScene.json";
      const mockNewFile = jest.fn() as jest.MockedFunction<typeof global.electron.newFile>;
      mockNewFile.mockReturnValue(
        new Promise( (resolve) => resolve({ canceled: false, filePath: newFilePath }) ),
      );
      global.electron.newFile = mockNewFile;

      const projectItem = new ProjectItem( project, "", "SceneEdit" );
      const tab = new Tab(projectItem);
      tab.ext = '.json';
      const data = { component: "SceneEdit" };
      await tab.writeFile(data);
      expect( global.electron.newFile ).toHaveBeenCalledWith(
        project.name, "", ".json",
      );
      expect( backend.writeItem ).toHaveBeenCalledWith(
        project.name, newFilePath, JSON.stringify(data),
      );
    });

    test( 'should rename file if name is different', async () => {
      const mockDeleteItem = jest.fn() as jest.MockedFunction<typeof backend.deleteItem>;
      mockDeleteItem.mockReturnValue(
        new Promise<void>( (resolve) => resolve() ),
      );
      backend.deleteItem = mockDeleteItem;

      const projectItem = new ProjectItem( project, "scene/Old Scene.json", "SceneEdit" );
      const tab = new Tab(projectItem);
      tab.name = 'New Scene';
      const data = { component: "SceneEdit" };
      await tab.writeFile(data);
      expect( backend.writeItem ).toHaveBeenCalledWith(
        project.name, "scene/New Scene.json", JSON.stringify(data),
      );
      expect( backend.deleteItem ).toHaveBeenCalledWith(
        project.name, "scene/Old Scene.json",
      );
    });
  });
});
