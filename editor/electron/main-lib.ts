import { type BrowserWindow, dialog, type SaveDialogReturnValue } from 'electron'
import path from 'node:path';

export function bitwiseNewFile(win: BrowserWindow, root: string, name: string, ext: string): Promise<SaveDialogReturnValue> {
  return dialog.showSaveDialog(win, {
    defaultPath: path.join(root, name),
    filters: [{ name: ext, extensions: [ext] }],
    properties: ['createDirectory'],
  })
    .then(
      (res) => {
        if (res.filePath) {
          res.filePath = path.relative(root, res.filePath);
        }
        if (res.filePath && !res.filePath.match(new RegExp("\\" + ext + "$"))) {
          res.filePath += '.' + ext;
        }
        return res
      },
    );
}
