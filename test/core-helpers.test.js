import { jest } from '@jest/globals';
import {
  debounce,
  formatDate,
  validateImageType,
  sanitizeFileName,
} from '../public/js/helpers.js';

describe('Core Helper Functions', () => {
  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('executes callback after wait time', () => {
      const callback = jest.fn();
      const debounced = debounce(callback, 1000);

      // Call debounced function
      debounced();
      expect(callback).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('only executes most recent call', () => {
      const callback = jest.fn();
      const debounced = debounce(callback, 1000);

      debounced();
      debounced();
      debounced();

      expect(callback).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('maintains correct context and arguments', () => {
      const context = { value: 'test' };
      const callback = jest.fn(function (arg) {
        expect(this).toBe(context);
        expect(arg).toBe('arg');
      });

      const debounced = debounce(callback, 1000);
      debounced.call(context, 'arg');

      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledWith('arg');
    });
  });

  describe('formatDate', () => {
    test('formats valid date correctly', () => {
      const result = formatDate('2023-01-15');
      expect(result).toBe('Jan 15, 2023');
    });

    test('handles different date formats', () => {
      expect(formatDate('2023/01/15')).toBe('Jan 15, 2023');
      expect(formatDate('2023-12-31')).toBe('Dec 31, 2023');
      expect(formatDate('2024-02-29')).toBe('Feb 29, 2024');
    });

    test('throws error for invalid date', () => {
      expect(() => formatDate('invalid')).toThrow('Invalid date');
      expect(() => formatDate('')).toThrow('Invalid date');
      expect(() => formatDate(null)).toThrow('Invalid date');
      expect(() => formatDate('2023-13-45')).toThrow('Invalid date');
    });

    test('handles timezone edge cases', () => {
      // Test date near UTC day boundary
      expect(formatDate('2023-12-31T23:59:59Z')).toBe('Dec 31, 2023');
      expect(formatDate('2024-01-01T00:00:01Z')).toBe('Jan 1, 2024');
    });
  });

  describe('validateImageType', () => {
    test('accepts valid image extensions', () => {
      expect(validateImageType('image.jpg')).toBe(true);
      expect(validateImageType('photo.jpeg')).toBe(true);
      expect(validateImageType('icon.png')).toBe(true);
      expect(validateImageType('animation.gif')).toBe(true);
    });

    test('accepts uppercase extensions', () => {
      expect(validateImageType('image.JPG')).toBe(true);
      expect(validateImageType('photo.JPEG')).toBe(true);
      expect(validateImageType('icon.PNG')).toBe(true);
      expect(validateImageType('animation.GIF')).toBe(true);
    });

    test('rejects invalid extensions', () => {
      expect(validateImageType('document.pdf')).toBe(false);
      expect(validateImageType('script.js')).toBe(false);
      expect(validateImageType('style.css')).toBe(false);
      expect(validateImageType('video.mp4')).toBe(false);
    });

    test('handles edge cases', () => {
      expect(validateImageType('')).toBe(false);
      expect(validateImageType(null)).toBe(false);
      expect(validateImageType('noextension')).toBe(false);
      expect(validateImageType('.jpg')).toBe(true);
      expect(validateImageType('multiple.dots.jpg')).toBe(true);
    });
  });

  describe('sanitizeFileName', () => {
    test('converts to lowercase', () => {
      expect(sanitizeFileName('IMAGE.jpg')).toBe('image.jpg');
      expect(sanitizeFileName('Photo.PNG')).toBe('photo.png');
    });

    test('replaces special characters with hyphens', () => {
      expect(sanitizeFileName('my photo!.jpg')).toBe('my-photo.jpg');
      expect(sanitizeFileName('vacation#2023.png')).toBe('vacation-2023.png');
      expect(sanitizeFileName('hello@world.jpg')).toBe('hello-world.jpg');
    });

    test('handles multiple special characters', () => {
      expect(sanitizeFileName('my!!photo##2023.jpg')).toBe('my-photo-2023.jpg');
      expect(sanitizeFileName('hello___world.png')).toBe('hello-world.png');
    });

    test('removes leading and trailing hyphens', () => {
      expect(sanitizeFileName('!photo!.jpg')).toBe('photo.jpg');
      expect(sanitizeFileName('-image-.png')).toBe('image.png');
    });

    test('handles filenames without extensions', () => {
      expect(sanitizeFileName('My Photo')).toBe('my-photo');
      expect(sanitizeFileName('Hello!World')).toBe('hello-world');
    });

    test('throws error for invalid input', () => {
      expect(() => sanitizeFileName('')).toThrow('Invalid file name');
      expect(() => sanitizeFileName(null)).toThrow('Invalid file name');
      expect(() => sanitizeFileName(undefined)).toThrow('Invalid file name');
    });

    test('preserves valid characters', () => {
      expect(sanitizeFileName('photo123.jpg')).toBe('photo123.jpg');
      expect(sanitizeFileName('image-2023.png')).toBe('image-2023.png');
    });
  });
});
