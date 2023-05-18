
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import ProjectItem from '../../../../src/model/ProjectItem.js';

let backend:MockBackend, projectName = "ProjectName", project:Project;
beforeEach( () => {
  backend = new MockBackend();
  project = new Project(backend, projectName);
});

describe( 'ProjectItem', () => {
  describe( 'constructor', () => {
    test( 'no children by default', () => {
      const item = new ProjectItem( project, "Scene.json", "SceneEdit" );
      expect( item.children ).toBeFalsy();
    });
  } );
});
