const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const rootHtml = await page.$eval('#root', el => el.innerHTML);
  console.log('ROOT HTML LENGTH:', rootHtml.length);
  if (rootHtml.length < 100) console.log('ROOT HTML:', rootHtml);
  
  await browser.close();
})();
