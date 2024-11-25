const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

const mdFile = path.join(__dirname, 'architecture.md');
const pdfFile = path.join(__dirname, 'architecture.pdf');

markdownpdf()
  .from(mdFile)
  .to(pdfFile, function () {
    console.log('Created PDF file:', pdfFile);
  });
