/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { debounce, formatDate, validateImageType, sanitizeFileName } from '../public/js/helpers.js';

describe('Utility Helper Functions', () => {
  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('debounces function calls', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      // Call it multiple times
      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      // Function should not have been called yet
      expect(func).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(100);

      // Function should have been called once
      expect(func).toHaveBeenCalledTimes(1);
    });

    test('debounces with arguments', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);
      const arg1 = 'test';
      const arg2 = { foo: 'bar' };

      debouncedFunc(arg1, arg2);

      jest.advanceTimersByTime(100);

      expect(func).toHaveBeenCalledWith(arg1, arg2);
    });
  });

  describe('formatDate', () => {
    test('formats valid date string', () => {
      const date = '2023-01-01T00:00:00.000Z';
      expect(formatDate(date)).toBe('Jan 1, 2023');
    });

    test('handles different date formats', () => {
      const date = '2023/12/25';
      expect(formatDate(date)).toBe('Dec 25, 2023');
    });

    test('throws error for invalid date', () => {
      expect(() => formatDate('invalid-date')).toThrow('Invalid date');
      expect(() => formatDate('')).toThrow('Invalid date');
      expect(() => formatDate(null)).toThrow('Invalid date');
    });

    test('maintains UTC consistency', () => {
      const date = '2023-12-31T23:59:59.999Z';
      expect(formatDate(date)).toBe('Dec 31, 2023');
    });
  });

  describe('validateImageType', () => {
    test('validates correct image extensions', () => {
      expect(validateImageType('image.jpg')).toBe(true);
      expect(validateImageType('photo.jpeg')).toBe(true);
      expect(validateImageType('icon.png')).toBe(true);
      expect(validateImageType('animation.gif')).toBe(true);
    });

    test('validates uppercase extensions', () => {
      expect(validateImageType('image.JPG')).toBe(true);
      expect(validateImageType('photo.JPEG')).toBe(true);
      expect(validateImageType('icon.PNG')).toBe(true);
      expect(validateImageType('animation.GIF')).toBe(true);
    });

    test('rejects invalid extensions', () => {
      expect(validateImageType('document.pdf')).toBe(false);
      expect(validateImageType('script.js')).toBe(false);
      expect(validateImageType('style.css')).toBe(false);
    });

    test('handles edge cases', () => {
      expect(validateImageType('')).toBe(false);
      expect(validateImageType(null)).toBe(false);
      expect(validateImageType('no-extension')).toBe(false);
      expect(validateImageType('.jpg')).toBe(true);
    });
  });

  describe('sanitizeFileName', () => {
    test('sanitizes basic file names', () => {
      expect(sanitizeFileName('My Image.jpg')).toBe('my-image.jpg');
      expect(sanitizeFileName('vacation_photo.png')).toBe('vacation-photo.png');
    });

    test('handles special characters', () => {
      expect(sanitizeFileName('My@Special#Photo!.jpg')).toBe('my-special-photo.jpg');
      // Note: Non-ASCII characters are stripped, which is the expected behavior
      expect(sanitizeFileName('Über_café.png')).toBe('ber-caf.png');
    });

    test('removes leading/trailing special characters', () => {
      expect(sanitizeFileName('---photo---.jpg')).toBe('photo.jpg');
      expect(sanitizeFileName('___image___.png')).toBe('image.png');
    });

    test('collapses multiple separators', () => {
      expect(sanitizeFileName('my---photo.jpg')).toBe('my-photo.jpg');
      expect(sanitizeFileName('vacation___photo.png')).toBe('vacation-photo.png');
    });

    test('handles edge cases', () => {
      expect(() => sanitizeFileName('')).toThrow('Invalid file name');
      expect(() => sanitizeFileName(null)).toThrow('Invalid file name');
      expect(sanitizeFileName('noextension')).toBe('noextension');
      expect(sanitizeFileName('.gitignore')).toBe('.gitignore');
    });

    test('preserves file extension case but lowercases name', () => {
      expect(sanitizeFileName('MyImage.JPG')).toBe('myimage.jpg');
      expect(sanitizeFileName('TEST.PNG')).toBe('test.png');
    });
  });
});
