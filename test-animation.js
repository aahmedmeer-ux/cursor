const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureWipeAnimation() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Loading PDP...');
  await page.goto('http://localhost:3000/product/rs-25p-fade-impact-vest', {
    waitUntil: 'networkidle2'
  });
  
  await wait(2000);

  // Scroll to color swatches
  await page.evaluate(() => {
    window.scrollTo(0, 600);
  });
  
  await wait(500);

  // Find color swatch buttons
  const colorButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const swatchButtons = buttons.filter(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return rect.width > 20 && rect.width < 80 && 
             rect.height > 20 && rect.height < 80 &&
             (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || btn.querySelector('div[style*="background"]'));
    });
    return swatchButtons.map((btn, idx) => ({
      index: idx,
      position: {
        x: btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2,
        y: btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2
      }
    }));
  });

  console.log(`Found ${colorButtons.length} color swatches`);

  if (colorButtons.length > 1) {
    console.log('Capturing rapid sequence during color change...');
    
    // Take screenshot before click
    await page.screenshot({ path: '/tmp/wipe-before.png' });
    
    // Click and capture multiple frames
    await page.mouse.click(colorButtons[1].position.x, colorButtons[1].position.y);
    
    // Capture at different intervals
    await wait(100);
    await page.screenshot({ path: '/tmp/wipe-100ms.png' });
    
    await wait(150);
    await page.screenshot({ path: '/tmp/wipe-250ms.png' });
    
    await wait(250);
    await page.screenshot({ path: '/tmp/wipe-500ms.png' });
    
    await wait(500);
    await page.screenshot({ path: '/tmp/wipe-1000ms.png' });
    
    console.log('Saved 5 animation frames to /tmp/wipe-*.png');
    console.log('Check these files to see if white cursor wipe is visible');
  }

  await browser.close();
}

captureWipeAnimation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
