const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkSidebarCTA() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Loading homepage with hard refresh...');
  await page.goto('http://localhost:3000', {
    waitUntil: 'networkidle2'
  });
  
  // Hard refresh
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(2000);

  // Take screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/jettribe-sidebar-cta.png',
    fullPage: false
  });

  // Check the Shop Now button in Race Essentials area
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const shopNowButtons = buttons.filter(btn => 
      btn.textContent.toLowerCase().includes('shop now')
    );
    
    return shopNowButtons.map(btn => {
      const style = window.getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      
      // Check if it's in the right sidebar (x > 700)
      if (rect.left > 700) {
        return {
          text: btn.textContent.trim(),
          color: style.color,
          backgroundColor: style.backgroundColor,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          readable: style.color !== style.backgroundColor
        };
      }
      return null;
    }).filter(Boolean);
  });

  console.log('\nShop Now Button Analysis:');
  console.log(JSON.stringify(buttonInfo, null, 2));

  const isReadable = buttonInfo.length > 0 && buttonInfo[0].readable;
  console.log(`\nReadable: ${isReadable ? 'YES' : 'NO'}`);

  await browser.close();
  return isReadable;
}

checkSidebarCTA().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
