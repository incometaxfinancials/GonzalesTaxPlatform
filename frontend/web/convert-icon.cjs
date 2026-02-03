const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'logo.svg');
const pngPath = path.join(__dirname, 'temp-icon.png');
const icoPath = path.join('C:', 'Users', 'leadf', 'Desktop', 'itf-logo.ico');

async function convertSvgToIco() {
  try {
    console.log('Converting ITF logo to icon...');

    // Convert SVG to PNG (256x256)
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(pngPath);

    console.log('PNG created, converting to ICO...');

    // Convert PNG to ICO
    const icoBuffer = await pngToIco([pngPath]);
    fs.writeFileSync(icoPath, icoBuffer);

    // Clean up temp PNG
    fs.unlinkSync(pngPath);

    console.log('ITF icon created successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

convertSvgToIco();
