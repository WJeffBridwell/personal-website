# Personal Website with Image Gallery

A modern personal website featuring a dynamic image gallery with advanced search, sort, and filter capabilities.

## Project Overview

This is a full-stack web application built with:
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js with Express
- Testing: Jest with Testing Library
- Security: Helmet middleware and rate limiting

### Key Features

- **Dynamic Image Gallery**
  - Advanced search functionality
  - A-Z sorting capabilities
  - Letter-based filtering
  - Responsive grid layout
  - Modal image viewing

- **Modern UI Components**
  - Sticky navigation
  - Interactive controls
  - Responsive design
  - Smooth animations

### Project Structure

```
personal-website/
├── public/                 # Static assets
│   ├── js/                # JavaScript modules
│   │   ├── gallery.js     # Gallery functionality
│   │   └── modal.js       # Modal component
│   ├── styles.css         # Main stylesheet
│   └── index.html         # Main HTML
├── routes/                # Express routes
│   └── gallery.js         # Gallery API endpoints
├── test/                  # Test files
├── server.js              # Express server
└── api.js                # API utilities
```

### Technical Features

- ES6+ JavaScript with modules
- Jest testing suite with JSDOM
- Express middleware for security
- Image processing with Sharp
- ESLint for code quality

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Run tests:
```bash
npm test
```

## Development Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with hot reload
- `npm test`: Run test suite
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Check code style
- `npm run lint:fix`: Fix code style issues

## Dependencies

### Production
- express: Web framework
- express-rate-limit: API rate limiting
- helmet: Security middleware
- sharp: Image processing

### Development
- Jest: Testing framework
- Babel: JavaScript compiler
- ESLint: Code linting
- Testing Library: DOM testing utilities

## Security Features

- Helmet security headers
- Rate limiting on API endpoints
- Input sanitization
- Error handling middleware

## Browser Support

Optimized for modern browsers with CSS Grid and ES6+ JavaScript support.
