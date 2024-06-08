import { describe, expect, test } from '@jest/globals';
import Game from '../src/Game';
import Scene from '../src/Scene';
import System from '../src/System';
import ProgressEvent from '../src/event/ProgressEvent';

class FakeSystem extends System {
  resolveInit: any = null;
  rejectInit: any = null;
  async init() {
    const progress = new ProgressEvent();
    progress.loaded = 0;
    progress.total = 1;
    this.dispatchEvent(progress);
    return new Promise<any>(
      (resolve, reject) => {
        this.resolveInit = resolve;
        this.rejectInit = reject;
      }
    );
  }
}

describe('Scene.init', () => {
  const game = new Game({
    systems: {
      fakeSystem: FakeSystem,
      mockSystem: FakeSystem,
    },
  });
  const scene = new Scene(game);
  scene.addSystem('fakeSystem');
  scene.addSystem('mockSystem');
  const [fakeSystem, mockSystem] = scene.systems as FakeSystem[];

  const progressEvents = [] as ProgressEvent[];
  scene.addEventListener('progress', (e: ProgressEvent) => {
    progressEvents.push(e);
  });

  const promise = scene.init();

  test('First progress event(s) should be fired before init() is finished', () => {
    expect(progressEvents.length).toBe(2);
    expect(progressEvents[0].loaded).toBe(0);
    expect(progressEvents[0].total).toBe(1);
    expect(progressEvents[1].loaded).toBe(0);
    expect(progressEvents[1].total).toBe(2);
  });

  test('System progress event should bubble up', () => {
    fakeSystem.dispatchEvent(new ProgressEvent(1, 1));
    expect(progressEvents.length).toBe(3);
    expect(progressEvents[2].loaded).toBe(1);
    expect(progressEvents[2].total).toBe(2);
  });

  test('System progress event can change its total', () => {
    mockSystem.dispatchEvent(new ProgressEvent(5, 5));
    expect(progressEvents.length).toBe(4);
    expect(progressEvents[3].loaded).toBe(6);
    expect(progressEvents[3].total).toBe(6);
  });

  test('init() promise resolves after all System init() promises', () => {
    fakeSystem.resolveInit();
    mockSystem.resolveInit();
    expect(promise).resolves.toEqual(expect.anything());
  });
});

describe('Scene.addEntity', () => {
  test('entity is stored for later lookup', () => {
    const game = new Game({});
    const scene = game.addScene();
    const entityName = 'Entity Name';
    const entity = scene.addEntity({ name: entityName });
    expect(scene.eids).toContain(entity.id)
    expect(scene.getEntityById(entity.id)).toBe(entity)
    expect(scene.getEntityByPath(entityName)).toBe(entity)
  });

  test('entity parent/child relationships', () => {
    const game = new Game({});
    const scene = game.addScene();
    const parentName = 'Parent Entity';
    const parent = scene.addEntity({ name: parentName });
    const childName = 'Child Entity';
    const child = parent.addEntity({ name: childName });
    const childPath = [parentName, childName].join('/');
    expect(scene.eids).toContain(child.id)
    expect(scene.getEntityById(child.id)).toBe(child)
    expect(scene.getEntityByPath(childPath)).toBe(child)
  });
});

describe('Scene.freeze', () => {
  test('Scene systems are frozen', () => {
    const game = new Game({
      systems: {
        fakeSystem: FakeSystem,
      },
    });
    const scene = new Scene(game);
    scene.addSystem('fakeSystem');
    const sceneData = scene.freeze();
    expect(sceneData.systems).toHaveLength(1);
    expect(sceneData.systems[0]).toMatchObject({ name: 'fakeSystem' });
  });

  test('Scene entities are frozen', () => {
    const game = new Game({
      systems: {
        fakeSystem: FakeSystem,
      },
    });
    const scene = new Scene(game);
    const entityName = "New Entity";
    scene.addEntity({ name: entityName });
    const sceneData = scene.freeze();
    expect(sceneData.entities).toHaveLength(1);
    expect(sceneData.entities[0]).toMatchObject({ name: entityName });
  });

  test('Entities are arranged in a tree', () => {
    const game = new Game({
      systems: {
        fakeSystem: FakeSystem,
      },
    });
    const scene = new Scene(game);
    const parentEntityName = "Parent Entity";
    const parentEntity = scene.addEntity({ name: parentEntityName });
    const childEntityName = "Child Entity";
    parentEntity.addEntity({ name: childEntityName });
    const sceneData = scene.freeze();
    expect(sceneData.entities).toHaveLength(1);
    expect(sceneData.entities[0]).toMatchObject({ name: parentEntityName });
    expect(sceneData.entities[0].children).toHaveLength(1);
    expect(sceneData.entities[0].children?.[0]).toMatchObject({ name: childEntityName });
  });
});
