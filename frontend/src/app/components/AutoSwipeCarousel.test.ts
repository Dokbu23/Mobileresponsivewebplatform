import { describe, expect, it } from 'vitest';
import { sanitizeImages } from './AutoSwipeCarousel';

describe('sanitizeImages', () => {
  it('keeps only the first URL for each exact URL and filename', () => {
    expect(sanitizeImages([
      '/storage/accommodations/pool.jpg',
      '/storage/accommodations/pool.jpg',
      'https://example.com/other/pool.jpg?size=large',
      '/storage/accommodations/room.jpg',
      null,
      '',
    ])).toEqual([
      '/storage/accommodations/pool.jpg',
      '/storage/accommodations/room.jpg',
    ]);
  });

  it('compares filenames case-insensitively and ignores query strings', () => {
    expect(sanitizeImages([
      '/gallery/Beach.JPG?version=1',
      'https://example.com/photos/beach.jpg?version=2',
    ])).toEqual(['/gallery/Beach.JPG?version=1']);
  });

  it('returns an empty array for non-array input', () => {
    expect(sanitizeImages(null)).toEqual([]);
  });
});
