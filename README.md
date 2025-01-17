# Personal Website with Image Gallery

A modern, responsive personal website featuring a dynamic image gallery, blog integration, and advanced media management capabilities. Built with modern JavaScript and comprehensive test coverage.

## 🚀 Features

- **Dynamic Image Gallery**
  - Semantic search with natural language processing
  - Multi-criteria sorting (name, date, size)
  - A-Z letter filtering with visual feedback
  - Responsive grid layout with automatic resizing
  - Modal image viewing with keyboard navigation
  - Lazy loading for optimal performance
  - Multiple media type support (images, videos, VR)
  - Tag-based organization

- **Blog Integration**
  - Hexo-powered blog engine
  - Markdown support
  - Custom theming
  - Post management API
  - Dynamic content rendering

- **Modern Architecture**
  - ES6+ JavaScript modules
  - Event-driven component architecture
  - Responsive design with CSS Grid/Flexbox
  - Progressive enhancement
  - Accessibility-first approach
  - Comprehensive logging system
  - Performance monitoring

- **Developer Experience**
  - Comprehensive test suite (90%+ coverage)
  - ESLint code quality enforcement
  - Automated documentation
  - Git hooks for code quality
  - Continuous Integration ready
  - Debug middleware
  - Detailed performance metrics

## 🏗️ Technical Stack

- **Frontend**
  - Vanilla JavaScript (ES6+)
  - CSS3 with Grid/Flexbox
  - HTML5 Semantic Elements
  
- **Backend**
  - Node.js
  - Express.js
  - Sharp for image processing
  - Hexo blog engine
  - Socket.IO for real-time features
  
- **Testing**
  - Jest
  - Testing Library
  - JSDOM
  
- **Security**
  - Helmet.js
  - Rate limiting
  - Content Security Policy
  - XSS Protection
  - CORS configuration

## 📁 Project Structure

```
personal-website/
├── public/                 # Static assets and client-side code
│   ├── js/                # JavaScript modules
│   │   ├── gallery.js     # Gallery component and logic
│   │   ├── blog.js        # Blog functionality
│   │   ├── content-gallery.js # Enhanced media gallery
│   │   ├── helpers.js     # Utility functions
│   │   └── modal.js       # Modal component
│   ├── css/               # Stylesheets
│   └── *.html             # Entry points
├── routes/                # Express routes
│   └── gallery.js         # Gallery API endpoints
├── blog/                  # Blog content and configuration
│   ├── source/           # Blog posts and pages
│   └── _config.yml       # Hexo configuration
├── logs/                  # Application logs
│   ├── console.log       # General logs
│   ├── gallery-debug.log # Gallery-specific logs
│   └── gallery-metrics.log # Performance metrics
├── test/                  # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
│   └── architecture/     # Architecture decisions
├── server.js             # Express server
└── api.js                # API utilities
```

## 🚦 Getting Started

1. **Prerequisites**
   - Node.js >= 14.x
   - npm >= 6.x

2. **Installation**
   ```bash
   git clone https://github.com/yourusername/personal-website.git
   cd personal-website
   npm install
   ```

3. **Development**
   ```bash
   npm run dev     # Start development server
   npm run test    # Run test suite
   npm run lint    # Run linter
   ```

4. **Production**
   ```bash
   npm run build   # Build for production
   npm start       # Start production server
   ```

## 🧪 Testing

The project maintains high test coverage across all components:

```bash
------------|---------|----------|---------|---------|
File        | % Stmts | % Branch | % Funcs | % Lines |
------------|---------|----------|---------|---------|
All files   |   90.61 |    76.70 |   90.19 |   90.52 |
 gallery.js |   87.90 |    77.34 |   93.22 |   87.50 |
 helpers.js |   98.41 |    79.84 |  100.00 |   98.87 |
 modal.js   |   75.47 |    54.54 |   50.00 |   75.47 |
------------|---------|----------|---------|---------|
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Testing Strategy](docs/testing/README.md)
- [Contributing Guide](CONTRIBUTING.md)

## 🔒 Security

- HTTPS enforced in production
- Content Security Policy (CSP) headers
- Rate limiting on API endpoints
- Input validation and sanitization
- Regular dependency updates
- XSS protection
- CORS configuration
- Proper error handling

## 📈 Performance

- Advanced caching system
  - LRU cache for thumbnails
  - Preview caching
  - Metadata caching
  - ETag support
- Image optimization
  - Multiple format support (JPEG, WebP, AVIF)
  - Quality optimization
  - Thumbnail generation
- Lazy loading of images
- Compression enabled
- Browser caching
- Responsive images
- Optimized JavaScript bundles
- Batch processing support
- Cache warmup system

## 🔄 Future Improvements

1. Redis integration for enhanced caching
2. Worker system for image processing
3. Expanded API documentation
4. Increased test coverage
5. Container support
6. GraphQL API option
7. WebSocket real-time updates
8. Machine learning for image tagging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
