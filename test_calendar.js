const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) {
      console.log('PAGE NETWORK ERROR:', response.status(), response.url());
    }
  });
  await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'calendar_debug.png' });
  await browser.close();
})();
