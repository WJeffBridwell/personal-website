# Jeff Bridwell - Personal Portfolio Website

## Overview
A modern, responsive personal portfolio website showcasing professional skills, projects, and contact information.

## Technologies Used
- HTML5
- CSS3
- Vanilla JavaScript
- Responsive Design
- Font Awesome Icons

## Features
- Smooth scrolling navigation
- Responsive layout
- Interactive project cards
- Typing effect on hero subtitle
- Simple contact form with client-side validation

## Setup and Installation
1. Clone the repository
2. Open `index.html` in a modern web browser
3. No additional dependencies required

## Customization
- Update personal information in `index.html`
- Modify styling in `styles.css`
- Add your projects in the Projects section
- Replace `profile.jpg` with your own image

## Testing

The website includes a comprehensive test suite using Mocha and JSDOM. The tests cover:

- Filter functionality
  - Letter-based filtering
  - Search box filtering
  - "All" filter reset
- Image gallery features
  - Image card display
  - Overlay interactions
  - Modal behavior
- Layout and styling
  - Spacing and margins
  - Element alignment
- Contact form validation

### Running Tests

To run the test suite:

```bash
npm test
```

### Test Structure

Tests are located in `test/test.js` and use the following technologies:
- Mocha: Test framework
- JSDOM: Browser environment simulation
- Node's built-in assert: Assertions

Each test file is organized into logical sections:
1. Filter Bar Tests
2. Image Gallery Tests
3. Modal Tests
4. Image Card Overlay Tests
5. Alignment Tests
6. Contact Form Tests

## Future Improvements
- Backend form submission
- More detailed project descriptions
- Dark/light mode toggle
- Animated transitions

## Contact
Jeff Bridwell
[Your Email]
[Your LinkedIn]
