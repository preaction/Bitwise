
import {describe, test, expect} from '@jest/globals';
import Asset from '../src/Asset.js';

describe('Asset', () => {
  test('requires a Load object', () => {
    // @ts-ignore
    expect( () => new Asset(null, "") ).toThrow();
  } );
});
