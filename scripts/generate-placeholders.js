const fs = require('fs');
const path = require('path');

const STYLES = [
  { name: 'hero-pizza', width: 800, height: 800, dir: 'images' },
  { name: 'neapolitan', width: 600, height: 400, dir: 'images/styles' },
  { name: 'newyork', width: 600, height: 400, dir: 'images/styles' },
  { name: 'detroit', width: 600, height: 400, dir: 'images/styles' },
];

function generatePlaceholder(name, width, height, dir) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial" 
        font-size="30" 
        fill="#6b7280" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${name}
      </text>
    </svg>
  `;

  // Ensure directory exists
  const dirPath = path.join(process.cwd(), 'public', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Save as SVG
  fs.writeFileSync(path.join(dirPath, `${name}.svg`), svg);
}

// Generate all placeholders
STYLES.forEach(({ name, width, height, dir }) => {
  generatePlaceholder(name, width, height, dir);
  console.log(`Generated ${name}.svg`);
}); 