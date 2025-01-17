import { jest } from '@jest/globals';

const mockFs = {
  access: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
};

export const { access } = mockFs;
export const { readFile } = mockFs;
export const { readdir } = mockFs;
export const { stat } = mockFs;

// Export the mock object for test configuration
export const __mock = mockFs;
