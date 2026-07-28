const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testJettribe() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('1. Opening PDP with hard refresh...');
  await page.goto('http://localhost:3000/product/rs-25p-fade-impact-vest', {
    waitUntil: 'networkidle2'
  });
  
  // Force hard refresh
  await page.reload({ waitUntil: 'networkidle2' });
  
  // Wait for page to settle
  await wait(2000);

  console.log('2. Checking main product image...');
  
  // Take screenshot of PDP
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/jettribe-pdp-fixed.png',
    fullPage: false
  });
  console.log('   ✓ Saved jettribe-pdp-fixed.png');

  // Check if main image loaded (look for img elements, not gray boxes)
  const mainImageInfo = await page.evaluate(() => {
    // Look for the main product image container
    const imgs = document.querySelectorAll('img[alt*="RS-25P"], img[src*="fade"], img');
    const info = [];
    
    imgs.forEach((img, idx) => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100 && rect.top < 800) {
        info.push({
          index: idx,
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          alt: img.alt,
          width: rect.width,
          height: rect.height,
          complete: img.complete
        });
      }
    });
    return info;
  });

  console.log('   Main image elements found:', mainImageInfo.length);
  mainImageInfo.forEach((img, idx) => {
    console.log(`   Image ${idx + 1}: ${img.naturalWidth}x${img.naturalHeight}, loaded: ${img.complete}, src: ${img.src.substring(0, 60)}...`);
  });

  console.log('\n3. Testing color swatch animation...');
  
  // Find color swatches
  const swatches = await page.$$('[role="button"][aria-label*="color"], button[title*="color"], button[class*="swatch"], button[class*="color"]');
  
  if (swatches.length === 0) {
    console.log('   Trying alternative selectors...');
    // Try finding by visual characteristics - circular buttons in a row
    const allButtons = await page.$$('button');
    console.log(`   Found ${allButtons.length} buttons total`);
  }

  // Take screenshot before clicking
  await page.screenshot({ 
    path: '/tmp/before-click.png',
    fullPage: false
  });

  // Scroll to color swatches area
  await page.evaluate(() => {
    const element = document.querySelector('[class*="color"], [class*="swatch"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => 
                      b.style.borderRadius && b.offsetWidth < 60 && b.offsetHeight < 60
                    );
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.scrollBy(0, -100);
  });

  await wait(1000);

  // Look for buttons that look like color swatches (small, round/square, in a row)
  const colorButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const swatchButtons = buttons.filter(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      // Small buttons with background colors
      return rect.width > 20 && rect.width < 80 && 
             rect.height > 20 && rect.height < 80 &&
             (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || btn.querySelector('div[style*="background"]'));
    });
    return swatchButtons.map((btn, idx) => ({
      index: idx,
      text: btn.textContent.trim(),
      position: {
        x: btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2,
        y: btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2
      }
    }));
  });

  console.log(`   Found ${colorButtons.length} potential color swatches`);

  if (colorButtons.length > 0) {
    // Click second swatch (if exists)
    if (colorButtons.length > 1) {
      console.log(`   Clicking swatch at position (${colorButtons[1].position.x}, ${colorButtons[1].position.y})`);
      await page.mouse.click(colorButtons[1].position.x, colorButtons[1].position.y);
      console.log('   Waiting to observe animation...');
      await wait(1500);
      
      await page.screenshot({ 
        path: '/opt/cursor/artifacts/jettribe-pdp-wipe.png',
        fullPage: false
      });
      console.log('   ✓ Saved jettribe-pdp-wipe.png');
    }

    // Click third swatch
    if (colorButtons.length > 2) {
      console.log(`   Clicking another swatch...`);
      await page.mouse.click(colorButtons[2].position.x, colorButtons[2].position.y);
      await wait(1500);
    }
  } else {
    console.log('   ⚠ Could not find color swatches automatically');
  }

  console.log('\n4. Checking homepage sidebar...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await wait(2000);
  
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/jettribe-sidebar-fixed.png',
    fullPage: false
  });
  console.log('   ✓ Saved jettribe-sidebar-fixed.png');

  // Check for "Shop Now" button text
  const shopNowVisible = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const shopNowBtn = buttons.find(btn => 
      btn.textContent.toLowerCase().includes('shop now') ||
      btn.textContent.toLowerCase().includes('shop')
    );
    if (shopNowBtn) {
      const style = window.getComputedStyle(shopNowBtn);
      return {
        text: shopNowBtn.textContent.trim(),
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        visible: style.visibility !== 'hidden' && style.opacity !== '0'
      };
    }
    return null;
  });

  if (shopNowVisible) {
    console.log('   "Shop Now" button found:', shopNowVisible);
  } else {
    console.log('   ⚠ "Shop Now" button not found or not visible');
  }

  await browser.close();
  console.log('\n✅ Testing complete!');
}

testJettribe().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
