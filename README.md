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

## 🛠️ Development Environment

### Prerequisites
- macOS (Tested on macOS Ventura and later)
- [Terraform](https://www.terraform.io/) (>= 1.0.0)
- [Homebrew](https://brew.sh/)

### Local Environment Setup with Terraform

The project uses Terraform to manage local development environment setup. This includes:

1. Installing required dependencies (Node.js, npm)
2. Setting up project configuration
3. Installing project dependencies
4. Configuring development servers

To set up your local environment:

```bash
cd terraform
terraform init
terraform apply
```

This will:
- Install Node.js 20 via Homebrew (if not present)
- Install project dependencies including Hexo
- Configure nodemon for development
- Set up environment variables
- Create necessary configuration files

### Manual Setup (Alternative)

If you prefer not to use Terraform, you can manually set up the environment:

```bash
# Install Node.js 20
brew install node@20

# Install project dependencies
npm install

# Install development dependencies
npm install --save-dev nodemon

# Install Hexo and its dependencies
npm install hexo hexo-server hexo-renderer-ejs hexo-renderer-marked hexo-renderer-stylus --save
```

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

## 📚 Documentation

### Architecture Documentation

The project's architecture is documented using PlantUML diagrams located in the `docs/diagrams` directory:

- `class_diagram.puml`: Shows the class structure and relationships
- `context_diagram.puml`: Illustrates system context and boundaries
- `sequence_diagram.puml`: Details key interaction flows

To view the diagrams:
1. Install a PlantUML viewer (VS Code extension recommended)
2. Open the `.puml` files in the `docs/diagrams` directory

### API Documentation

The server exposes several RESTful APIs:

#### Gallery API
- `GET /api/images`: List all images with optional filters
- `POST /api/images`: Upload new images
- `GET /api/search`: Search images using natural language
- `GET /api/tags`: Get all available tags

#### Blog API
- `GET /blog/api/posts`: List all blog posts
- `POST /blog/api/posts`: Create a new blog post
- `GET /blog/api/posts/:path`: Get a specific post
- `PUT /blog/api/posts/:path`: Update a post
- `DELETE /blog/api/posts/:path`: Delete a post

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
