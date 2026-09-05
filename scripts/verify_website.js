const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('1. Loading http://localhost:8000/ ...');
  await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Initial Hero view (dark mode)
  await page.screenshot({ path: '/tmp/test_hero_dark.png' });
  console.log('Saved /tmp/test_hero_dark.png');

  // Test light mode hero
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/test_hero_light.png' });
  console.log('Saved /tmp/test_hero_light.png');

  // Switch back to dark mode
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(300);

  // Scroll down 260px (header should be visible)
  await page.evaluate(() => window.scrollTo(0, 260));
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/test_hero_scrolled.png' });
  console.log('Saved /tmp/test_hero_scrolled.png');

  // Scroll to #hq-console
  await page.evaluate(() => {
    const el = document.getElementById('hq-console');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/test_hq_console_stage.png' });
  console.log('Saved /tmp/test_hq_console_stage.png');

  // Click on "Brand Lemon Matrix" tab
  console.log('Clicking on Lemon Matrix card...');
  const lemonCard = await page.$('.hq-yield-card[data-id="report-lemon"]');
  if (lemonCard) {
    await lemonCard.scrollIntoViewIfNeeded();
    await lemonCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test_hq_lemon_selected.png' });
    console.log('Saved /tmp/test_hq_lemon_selected.png');
  }

  // Click "Enlarge" to test Lightbox
  console.log('Opening Lightbox modal...');
  const btnEnlarge = await page.$('#btnEnlargeFeatured');
  if (btnEnlarge) {
    await btnEnlarge.scrollIntoViewIfNeeded();
    await btnEnlarge.click();
    await page.waitForSelector('#hqYieldLightboxModal.is-active', { timeout: 5000 });
    await page.screenshot({ path: '/tmp/test_lightbox_modal.png' });
    console.log('Saved /tmp/test_lightbox_modal.png');
    
    // Close modal
    const closeBtn = await page.$('#closeHqLightboxBtn');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // Test one report page
  console.log('Testing report page...');
  await page.goto('http://localhost:8000/reports/depreciation_audit.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/test_report_page.png' });
  console.log('Saved /tmp/test_report_page.png');

  await browser.close();
  console.log('All tests completed successfully!');
}

test().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
