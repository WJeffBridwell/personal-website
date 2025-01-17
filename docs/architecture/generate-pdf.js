const markdownpdf = require('markdown-pdf');

markdownpdf()
  .from('ARCHITECTURE.md')
  .to('ARCHITECTURE.pdf', () => {
    console.log('Created ARCHITECTURE.pdf');
  });
