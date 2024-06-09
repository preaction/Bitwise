import { describe, beforeEach, expect, test, jest } from '@jest/globals';
import Entity, { EntityData } from '../src/Entity.js';
import Game from '../src/Game.js';
import Scene from '../src/Scene.js';
import Transform from '../src/component/Transform.js';
import Active from '../src/component/Active.js';

let game: Game, scene: Scene, entity: Entity, entityName: string;
beforeEach(() => {
  game = new Game({});
  game.registerComponent('active', Active);
  scene = new Scene(game);
  scene.addComponent('active');
  entityName = 'Entity Name';
  entity = scene.addEntity({ name: entityName });
});

describe('Entity.path', () => {
  test('path cannot be empty', () => {
    // @ts-ignore
    expect(() => entity.path = null).toThrow();
    expect(() => entity.path = "").toThrow();
  });
});

describe('Entity.addEntity', () => {
  test('adds child entity', () => {
    const childName = 'Child Entity';
    const childPath = [entityName, childName].join('/');
    const child = entity.addEntity({ name: childName });
    expect(child.path).toBe(childPath);
    expect(entity.children).toHaveLength(1);
    expect(entity.children[0]).toBe(child);
  });

  test('adds entity to scene', () => {
    const childName = 'Child Entity';
    const child = entity.addEntity({ name: childName });
    expect(scene.getEntityById(child.id)).toBe(child);
    expect(scene.getEntityByPath(child.path)).toBe(child);
  });
});

describe('Entity.thaw', () => {
  test('thaw() updates entity properties', async () => {
    const data: EntityData = {
      $schema: "1",
      name: "New Path",
      type: "TestEntity",
      active: false,
    };
    await entity.thaw(data);
    expect(entity.path).toBe(data.name);
    expect(entity.type).toBe(data.type);
    expect(entity.active).toBe(data.active);
  });

  test('thaw() does not update properties not in data', async () => {
    const original = {
      name: entity.name,
      type: entity.type,
      active: entity.active,
    };
    await entity.thaw({ name: entity.name });
    expect(entity.name).toBe(original.name);
    expect(entity.type).toBe(original.type);
    expect(entity.active).toBe(original.active);
  });

  test('thaw() arranges child entities', async () => {
    const childData: EntityData = {
      $schema: "1",
      name: "Child",
      type: "TestEntity",
      active: false,
    };
    const parentData: EntityData = {
      $schema: "1",
      name: "Parent",
      type: "TestEntity",
      active: false,
      children: [
        childData,
      ],
    };
    await entity.thaw(parentData);
    expect(entity.children).toHaveLength(1);
    expect(entity.children[0].parent).toMatchObject({ path: entity.path });
  });
});

describe('Entity.freeze', () => {
  test('freezes entity properties', () => {
    entity.name = 'Entity Name';
    entity.active = true;
    const eData = entity.freeze();
    expect(eData.name).toBe(entity.name);
    expect(eData.active).toBeTruthy();
  });

  test('freezes entity components', () => {
    const componentName = 'transform';
    const componentProps = { x: 1, y: 1 };
    game.registerComponent(componentName, Transform);
    entity.addComponent(componentName, componentProps);
    const eData = entity.freeze();
    expect(eData.components).toHaveProperty(componentName)
    expect(eData.components?.transform).toMatchObject(componentProps)
  });

  test('freezes entity with descendants', () => {
    const child = entity.addEntity({ name: 'Child' });
    const grandchild = child.addEntity({ name: 'Grandchild' });
    const eData = entity.freeze();
    expect(eData.children).toHaveLength(1)
    expect(eData.children?.[0].name).toBe(child.name)
    expect(eData.children?.[0].children).toHaveLength(1)
    expect(eData.children?.[0].children?.[0].name).toBe(grandchild.name)
  });
});
