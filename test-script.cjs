const puppeteer = require('puppeteer');
const { setTimeout } = require('timers/promises');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', error => console.error('PAGE UNCAUGHT EXCEPTION:', error.message));

  await page.goto('http://localhost:5174/');
  await setTimeout(2000);
  
  try {
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      console.log('Logging in...');
      await page.type('input[type="text"]', 'rakesh');
      await page.type('input[type="password"]', '1234');
      await loginButton.click();
      await setTimeout(2000);
    }
    
    console.log('Clicking FAB / Add Button...');
    const plusButton = await page.$('.nav-fab');
    if (plusButton) {
      await plusButton.click();
      await setTimeout(1000);
      
      const chips = await page.$$('.chip');
      for (const chip of chips) {
        const text = await page.evaluate(el => el.textContent, chip);
        if (text && text.trim() === 'sale') {
           console.log('Clicking sale chip...');
           await chip.click();
        }
      }
      await setTimeout(1000);
    } else {
      console.log('No .nav-fab found.');
    }
  } catch (err) {
    console.error('Test script execution error:', err);
  }

  await browser.close();
})();
