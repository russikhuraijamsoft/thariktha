const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateIcons() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const svgPath = path.resolve(__dirname, '../public/icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const targets = [
    { name: 'pwa-192x192.png', width: 192, height: 192, padding: 0 },
    { name: 'pwa-512x512.png', width: 512, height: 512, padding: 0 },
    { name: 'pwa-maskable-512x512.png', width: 512, height: 512, padding: 64 }, // safe zone margin ~12.5%
    { name: 'apple-touch-icon.png', width: 180, height: 180, padding: 0 },
    { name: 'favicon.png', width: 64, height: 64, padding: 0 }
  ];

  for (const target of targets) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: ${target.width}px;
            height: ${target.height}px;
            overflow: hidden;
            background: #0a0a0a;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-container {
            width: ${target.width - target.padding * 2}px;
            height: ${target.height - target.padding * 2}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          ${svgContent}
        </div>
      </body>
      </html>
    `;

    await page.setViewport({ width: target.width, height: target.height, deviceScaleFactor: 1 });
    await page.setContent(html);
    const outPath = path.resolve(__dirname, '../public', target.name);
    await page.screenshot({ path: outPath, type: 'png', omitBackground: false });
    console.log(`Generated: ${target.name} (${target.width}x${target.height})`);
  }

  // Also create a copy for favicon.ico
  fs.copyFileSync(
    path.resolve(__dirname, '../public/favicon.png'),
    path.resolve(__dirname, '../public/favicon.ico')
  );
  console.log('Copied favicon.ico');

  await browser.close();
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
