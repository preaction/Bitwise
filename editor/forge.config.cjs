'use strict';

const path = require('path');
const fs = require('fs/promises');
const { bundle } = require('./bundler');

module.exports = {
  packagerConfig: {
    prune: false, // required for the workaround below to work
    icon: '../images/icon',
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Bitwise Editor"
      }
    },
    {
      name: "@electron-forge/maker-dmg"
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: [ 'linux' ],
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'preaction',
          name: 'bitwise'
        },
        prerelease: true,
        draft: true,
      }
    }
  ],
  hooks: {
    packageAfterCopy: async (
      /** @type {any} */ forgeConfig,
      /** @type {string} */ buildPath,
      /** @type {string} */ electronVersion,
      /** @type {string} */ platform,
      /** @type {string} */ arch,
    ) => {
      // this is a workaround until we find a proper solution
      // for running electron-forge in a mono repository
      await bundle(__dirname, buildPath);
      // Also add the examples folder
      await fs.cp('../examples', path.join(buildPath, 'examples'), { recursive: true });
      // And add the icon image (needed on linux)
      await fs.cp('../images/icon.png', path.join(buildPath, 'images', 'icon.png'), { recursive: true });
    },
  },
};
