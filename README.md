# Personal Website with Image Gallery

A modern, responsive personal website featuring a dynamic image gallery with advanced search, sort, and filter capabilities. Built with modern JavaScript and comprehensive test coverage.

## 🚀 Features

- **Dynamic Image Gallery**
  - Semantic search with natural language processing
  - Multi-criteria sorting (name, date, size)
  - A-Z letter filtering with visual feedback
  - Responsive grid layout with automatic resizing
  - Modal image viewing with keyboard navigation
  - Lazy loading for optimal performance

- **Modern Architecture**
  - ES6+ JavaScript modules
  - Event-driven component architecture
  - Responsive design with CSS Grid/Flexbox
  - Progressive enhancement
  - Accessibility-first approach

- **Developer Experience**
  - Comprehensive test suite (90%+ coverage)
  - ESLint code quality enforcement
  - Automated documentation
  - Git hooks for code quality
  - Continuous Integration ready

## 🏗️ Technical Stack

- **Frontend**
  - Vanilla JavaScript (ES6+)
  - CSS3 with Grid/Flexbox
  - HTML5 Semantic Elements
  
- **Backend**
  - Node.js
  - Express.js
  - Sharp for image processing
  
- **Testing**
  - Jest
  - Testing Library
  - JSDOM
  
- **Security**
  - Helmet.js
  - Rate limiting
  - Content Security Policy
  - XSS Protection

## 📁 Project Structure

```
personal-website/
├── public/                 # Static assets and client-side code
│   ├── js/                # JavaScript modules
│   │   ├── gallery.js     # Gallery component and logic
│   │   ├── helpers.js     # Utility functions
│   │   └── modal.js       # Modal component
│   ├── css/               # Stylesheets
│   └── index.html         # Entry point
├── routes/                # Express routes
│   └── gallery.js         # Gallery API endpoints
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

## 📈 Performance

- Lazy loading of images
- Minified and compressed assets
- Browser caching
- Responsive images
- Optimized JavaScript bundles

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
