// Mock image data
const mockImages = [
  {
    url: 'https://source.unsplash.com/random/800x600?nature',
    name: 'Nature Scene',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?city',
    name: 'City View',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?beach',
    name: 'Beach',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?mountain',
    name: 'Mountain',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?forest',
    name: 'Forest',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?desert',
    name: 'Desert',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?ocean',
    name: 'Ocean',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?sunset',
    name: 'Sunset',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?waterfall',
    name: 'Waterfall',
  },
  {
    url: 'https://source.unsplash.com/random/800x600?lake',
    name: 'Lake',
  },
];

// API endpoint function
function getImages(page = 1, limit = 10) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return mockImages.slice(start, end);
}

module.exports = {
  getImages,
};
