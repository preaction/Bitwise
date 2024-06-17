
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { BrowserWindow, dialog } from 'electron';
import { bitwiseNewFile } from '../../../electron/main-lib.js'

describe('bitwise-new-file', () => {
  const mockShowSaveDialog = jest.spyOn(dialog, 'showSaveDialog');
  beforeEach(() => {
    mockShowSaveDialog.mockReset();
  });
  test('should return relative path to file', async () => {
    const fileName = 'New File';
    const fileExt = 'json';
    const projectRoot = "/root/project";
    const relativePath = `path/to/${fileName}.${fileExt}`;
    mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: projectRoot + '/' + relativePath });
    const res = await bitwiseNewFile(new BrowserWindow(), projectRoot, fileName, fileExt);
    expect(res.filePath).toBe(relativePath);
  });
});
