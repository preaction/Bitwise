
import {describe, expect, test} from '@jest/globals';
import {getProjectTree} from '../../../electron/bitwise-build/project.js';

describe( 'project', () => {
  describe( 'getProjectTree()', () => {
    test('read project directory', async () => {
      const projectItems = await getProjectTree('test/mock/project');
      expect( projectItems ).toContainEqual(
        expect.objectContaining({
          path: "Scene.json",
        }),
      );
      expect( projectItems ).toContainEqual(
        expect.objectContaining({
          path: "image.png",
        }),
      );
      expect( projectItems ).toContainEqual(
        expect.objectContaining({
          path: "ui",
          children: expect.arrayContaining([
            expect.objectContaining({
              path: "ui/icon.png",
            }),
            expect.objectContaining({
              path: "ui/button.png",
            }),
          ]),
        }),
      );
    });
  });
});
