# Atomic Design Structure

This directory contains our styling system based on Atomic Design principles.

## Directory Structure

```
styles/
├── atoms/        # Basic building blocks
│   ├── _buttons.css
│   ├── _typography.css
│   └── _variables.css
├── molecules/    # Combinations of atoms
│   ├── _cards.css
│   └── _navigation.css
├── organisms/    # Complex components
│   ├── _content-gallery.css
│   └── _content-player.css
├── templates/    # Page-level layouts
│   └── _layouts.css
└── main.css      # Main stylesheet that imports all components
```

## Usage

Import `main.css` in your HTML files. All other CSS files are partials and should not be imported directly.

## Naming Conventions

- Prefix partial files with underscore (_)
- Use kebab-case for file names
- Use BEM methodology for class names:
  - Block: `.block`
  - Element: `.block__element`
  - Modifier: `.block--modifier` or `.block__element--modifier`
