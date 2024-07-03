import type { GameConfig } from "@fourstar/bitwise";

export type TreeNode = {
  name?: string,
  type?: string,
  children?: Array<TreeNode>,
};
export type ReleaseConfig = {
  scene: string,
};
export type ConfigFile = {
  game: GameConfig,
  release?: {
    zip: ReleaseConfig,
  },
};

