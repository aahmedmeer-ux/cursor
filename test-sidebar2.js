const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzePage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Loading homepage...');
  await page.goto('http://localhost:3000', {
    waitUntil: 'networkidle2'
  });
  
  await wait(2000);

  // Get all text containing "RACE", "Shop", or button-like elements on right side
  const analysis = await page.evaluate(() => {
    const results = {
      allTextWithRace: [],
      allTextWithShop: [],
      rightSideButtons: []
    };
    
    // Find all elements with "RACE" or "Shop"
    const allElements = Array.from(document.querySelectorAll('*'));
    
    allElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      const rect = el.getBoundingClientRect();
      
      if (text.includes('RACE') && text.length < 100) {
        results.allTextWithRace.push({
          text: text.substring(0, 50),
          tagName: el.tagName,
          x: Math.round(rect.left),
          y: Math.round(rect.top)
        });
      }
      
      if ((text.includes('Shop') || text.includes('SHOP')) && text.length < 100) {
        results.allTextWithShop.push({
          text: text.substring(0, 50),
          tagName: el.tagName,
          x: Math.round(rect.left),
          y: Math.round(rect.top)
        });
      }
    });
    
    // Find buttons/links on the right side (x > 700)
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      
      if (rect.left > 700 && rect.top < 1000) {
        results.rightSideButtons.push({
          text: btn.textContent?.trim().substring(0, 50) || '',
          tagName: btn.tagName,
          color: style.color,
          bg: style.backgroundColor,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    });
    
    return results;
  });

  console.log('\n=== TEXT WITH "RACE" ===');
  console.log(JSON.stringify(analysis.allTextWithRace.slice(0, 10), null, 2));
  
  console.log('\n=== TEXT WITH "SHOP" ===');
  console.log(JSON.stringify(analysis.allTextWithShop.slice(0, 10), null, 2));
  
  console.log('\n=== RIGHT SIDE BUTTONS ===');
  console.log(JSON.stringify(analysis.rightSideButtons, null, 2));

  await browser.close();
}

analyzePage().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
