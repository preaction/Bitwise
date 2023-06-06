import { _electron } from 'playwright';
import { test, expect } from '@playwright/test';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';

process.env.NODE_ENV = 'playwright';

test('open and release a project', async () => {
  const app = await _electron.launch({ args: ['dist/electron/main.cjs'] });
  const projectPath = path.join( process.cwd(), '../examples/Solitaire');

  // Override dialog method to open Solitaire
  await app.evaluate(async ({ dialog }, projectPath) => {
    dialog.showOpenDialog = () => {
      return Promise.resolve({
        canceled: false,
        filePaths: [projectPath],
      });
    };
  }, projectPath);

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

  // Override dialog method to save Solitaire zip file
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(),'bitwise-'));
  const zipPath = path.join( tmpdir, 'Solitaire.zip' );
  await app.evaluate(async ({ dialog }, zipPath:string) => {
    dialog.showSaveDialog = () => {
      return Promise.resolve({
        canceled: false,
        filePath: zipPath,
      });
    };
  }, zipPath);

  // Release
  await page.locator('#release-zip button').click();
  await page.waitForSelector('#release-zip button:not([disabled])');
  const stat = await fs.stat( zipPath );
  expect( stat.size ).toBeGreaterThan(0);

  await app.close();
})
