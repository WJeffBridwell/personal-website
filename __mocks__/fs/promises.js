import { jest } from '@jest/globals';

const mockFs = {
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
};

export const access = mockFs.access;
export const readFile = mockFs.readFile;
export const readdir = mockFs.readdir;
export const stat = mockFs.stat;

// Export the mock object for test configuration
export const __mock = mockFs;
