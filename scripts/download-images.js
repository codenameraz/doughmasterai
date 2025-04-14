const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Free-to-use pizza images from Unsplash - carefully selected minimalist shots
const IMAGES = [
  {
    // Clean overhead shot of a Neapolitan pizza for hero
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    name: 'hero-pizza',
    dir: 'images'
  },
  {
    // Classic Neapolitan with leopard spotting
    url: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47',
    name: 'neapolitan',
    dir: 'images/styles'
  },
  {
    // Classic NY slice with proper fold
    url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee',
    name: 'newyork',
    dir: 'images/styles'
  },
  {
    // Proper square Detroit style with crispy edges
    url: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707',
    name: 'detroit',
    dir: 'images/styles'
  }
];

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    // Increased quality to 90 for better clarity of details
    https.get(`${url}?w=1200&q=90&fm=webp&fit=crop&crop=edges`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }

      const writeStream = fs.createWriteStream(filepath);
      res.pipe(writeStream);

      writeStream.on('finish', () => {
        writeStream.close();
        resolve();
      });

      writeStream.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadAllImages() {
  for (const image of IMAGES) {
    const dirPath = path.join(process.cwd(), 'public', image.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filepath = path.join(dirPath, `${image.name}.webp`);
    console.log(`Downloading ${image.name}...`);
    
    try {
      await downloadImage(image.url, filepath);
      console.log(`Successfully downloaded ${image.name}`);
    } catch (error) {
      console.error(`Error downloading ${image.name}:`, error);
    }
  }
}

downloadAllImages(); 