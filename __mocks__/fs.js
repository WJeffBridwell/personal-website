import { jest } from '@jest/globals';

const mockFs = {
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
};

export default mockFs;
export const { promises } = mockFs;
