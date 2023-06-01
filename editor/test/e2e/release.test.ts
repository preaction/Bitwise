import { _electron } from 'playwright';
import { test, expect } from '@playwright/test';
import type {OpenDialogOptions} from 'electron';

process.env.NODE_ENV = 'playwright';

test('open and release a project', async () => {
  const app = await _electron.launch({ args: ['dist/electron/main.cjs'] });

  // Override dialog method to open Solitaire
  await app.evaluate(async ({ dialog }) => {
    dialog.showOpenDialog = () => {
      return Promise.resolve({
        canceled: false,
        filePaths: ['../examples/Solitaire'],
      });
    };
  });

  const page = await app.firstWindow();
  page.on('console', console.log);

  // Click the Open Project button
  await page.getByText('Open Project').click();

  // Click the gear icon to open the menu
  await page.getByTitle('Project Menu').click();
  // Click the Release menu item
  await page.getByText('Release').click();

  // The Release tab should now be active
  // Find the destination input element
  const sceneInput = page.getByTestId('inputScene');
  expect(sceneInput).toBeVisible();

  // Find the Loader scene in the project tree
  await page.getByTestId('projectTree').getByText('scenes').click();
  const loaderSceneTreeItem = page.getByTestId('projectTree').getByText('Loader');
  await loaderSceneTreeItem.hover();

  // Drag the Loader.json scene over the sceneInput
  await page.mouse.down();
  await sceneInput.hover();
  await page.mouse.up();

  // Release
  await page.locator('#release-zip button').click();
  // XXX: Save zip file somewhere
  // XXX: Unzip it and load it into a new browser context to test that it
  // works

  await app.close();
})
