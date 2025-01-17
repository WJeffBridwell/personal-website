/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { ContentPlayer } from '../public/js/content-player';

describe('ContentPlayer', () => {
  let contentPlayer;
  const modalId = 'content-player';

  beforeEach(() => {
    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.pause = jest.fn();
    window.HTMLMediaElement.prototype.play = jest.fn();
    window.HTMLMediaElement.prototype.load = jest.fn();

    document.body.innerHTML = `
            <div id="${modalId}" class="modal">
                <div class="content-player"></div>
                <button class="modal__close">&times;</button>
            </div>
        `;

    contentPlayer = new ContentPlayer(modalId);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('initialization', () => {
    expect(contentPlayer.modal).toBeTruthy();
    expect(contentPlayer.contentElement).toBeTruthy();
    expect(contentPlayer.closeButton).toBeTruthy();
  });

  test('open video content', () => {
    const content = {
      content_name: 'test.mp4',
      content_url: '/videos/test.mp4',
      isVideo: true,
    };
    contentPlayer.open(content);

    const video = contentPlayer.contentElement.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.querySelector('source').src).toContain(content.content_url);
    expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
  });

  test('open image content', () => {
    const content = {
      content_name: 'test.jpg',
      content_url: '/images/test.jpg',
      isVideo: false,
    };
    contentPlayer.open(content);

    const img = contentPlayer.contentElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain(content.content_url);
    expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
  });

  test('handle video error', () => {
    const content = {
      content_name: 'test.mp4',
      content_url: '/videos/test.mp4',
      isVideo: true,
    };
    contentPlayer.open(content);

    const video = contentPlayer.contentElement.querySelector('video');
    video.dispatchEvent(new Event('error'));

    expect(contentPlayer.contentElement.querySelector('.a-error-message')).toBeTruthy();
  });

  test('close content', () => {
    const content = {
      content_name: 'test.mp4',
      content_url: '/videos/test.mp4',
      isVideo: true,
    };
    contentPlayer.open(content);
    contentPlayer.close();

    expect(contentPlayer.contentElement.querySelector('video')).toBeFalsy();
    expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
  });

  test('close on modal click', () => {
    const content = {
      content_name: 'test.jpg',
      content_url: '/images/test.jpg',
      isVideo: false,
    };
    contentPlayer.open(content);
    contentPlayer.modal.click();

    expect(contentPlayer.contentElement.querySelector('img')).toBeFalsy();
    expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
  });

  test('not close on content click', () => {
    const content = {
      content_name: 'test.jpg',
      content_url: '/images/test.jpg',
      isVideo: false,
    };
    contentPlayer.open(content);
    contentPlayer.contentElement.click();

    expect(contentPlayer.contentElement.querySelector('img')).toBeTruthy();
    expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
  });

  test('get video mime type', () => {
    expect(contentPlayer.getVideoMimeType('test.mp4')).toBe('video/mp4');
    expect(contentPlayer.getVideoMimeType('test.webm')).toBe('video/webm');
    expect(contentPlayer.getVideoMimeType('test.mov')).toBe('video/quicktime');
    expect(contentPlayer.getVideoMimeType('test.unknown')).toBe('video/mp4');
  });
});
