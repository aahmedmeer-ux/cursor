const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkSidebar() {
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

  // Scroll to see sidebar
  await page.evaluate(() => {
    window.scrollTo(0, 300);
  });
  
  await wait(500);

  // Analyze the "Race Essentials" button
  const buttonInfo = await page.evaluate(() => {
    // Find the Race Essentials module
    const raceText = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent.includes('RACE ESSENTIALS')
    );
    
    if (!raceText) return { error: 'Race Essentials not found' };
    
    // Find nearest button or link
    const parent = raceText.closest('div');
    const buttons = parent ? Array.from(parent.querySelectorAll('button, a, [role="button"]')) : [];
    
    const buttonData = buttons.map(btn => {
      const style = window.getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      return {
        tagName: btn.tagName,
        text: btn.textContent.trim(),
        innerHTML: btn.innerHTML.substring(0, 200),
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        width: rect.width,
        height: rect.height,
        hasChildren: btn.children.length,
        classes: btn.className
      };
    });
    
    return buttonData;
  });

  console.log('\n=== SIDEBAR BUTTON ANALYSIS ===');
  console.log(JSON.stringify(buttonInfo, null, 2));

  // Take a focused screenshot of the sidebar
  const sidebarBox = await page.evaluate(() => {
    const raceText = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent.includes('RACE ESSENTIALS')
    );
    if (raceText) {
      const container = raceText.closest('div[class*="bg-"], aside, section');
      if (container) {
        const rect = container.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        };
      }
    }
    return null;
  });

  if (sidebarBox) {
    console.log('\nCapturing focused sidebar screenshot...');
    await page.screenshot({
      path: '/opt/cursor/artifacts/jettribe-sidebar-closeup.png',
      clip: sidebarBox
    });
    console.log('Saved to /opt/cursor/artifacts/jettribe-sidebar-closeup.png');
  }

  await browser.close();
}

checkSidebar().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
