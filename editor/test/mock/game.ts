
import {jest} from '@jest/globals';

export default class MockGame {
  systems = {}
  constructor() {}
  addScene() {
    return {
      thaw: jest.fn(),
      init: jest.fn(),
      getSystem: jest.fn().mockImplementation( () => {
        return {
          addEventListener: jest.fn(),
        };
      }),
      start: jest.fn(),
      render: jest.fn(),
      update: jest.fn(),
    };
  }
  start() {}
  stop() {}
}
