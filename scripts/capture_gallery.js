const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const outDir = path.join(__dirname, '../website/images/gallery');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. HQ Desktop Screens (1440x900, deviceScaleFactor: 2 for crisp Retina shots)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const desktopPage = await desktopContext.newPage();

  console.log('Capturing HQ Dashboard...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_dashboard.png'), fullPage: false });

  console.log('Capturing HQ Asset Registry...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/assets', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_asset_registry.png'), fullPage: false });

  console.log('Capturing HQ Asset Detail & Schematics...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/assets/asset_hvac_402', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_asset_detail.png'), fullPage: false });

  console.log('Capturing HQ Work Orders Dispatch Kanban...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/work-orders', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_work_orders.png'), fullPage: false });

  console.log('Capturing HQ Sync Engine & Tag Studio...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/sync-operations', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_sync_studio.png'), fullPage: false });

  console.log('Capturing HQ Fleet Analytics...');
  await desktopPage.goto('http://localhost:8000/hq/index.html#/analytics', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1200);
  await desktopPage.screenshot({ path: path.join(outDir, 'hq_analytics.png'), fullPage: false });

  await desktopContext.close();

  // 2. Field App Mobile / iOS Views (iPhone 15 Pro viewport: 390x844)
  console.log('Capturing Field App iOS Views...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();
  try {
    await mobilePage.goto('http://localhost:8000/field/index.html', { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(2500);
    await mobilePage.screenshot({ path: path.join(outDir, 'field_ios_scan.png') });

    // Click on Work Orders tab (2nd item in bottom bar: x ~ 146, y ~ 810)
    await mobilePage.mouse.click(146, 810);
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({ path: path.join(outDir, 'field_ios_workorders.png') });

    // Click on Turns tab (3rd item: x ~ 244, y ~ 810)
    await mobilePage.mouse.click(244, 810);
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({ path: path.join(outDir, 'field_ios_turns.png') });

    // Click on Settings / Tag Studio tab (4th item: x ~ 340, y ~ 810)
    await mobilePage.mouse.click(340, 810);
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({ path: path.join(outDir, 'field_ios_settings.png') });
  } catch (err) {
    console.warn('Field iOS capture warning:', err.message);
  }
  await mobileContext.close();

  // 3. Field App Tablet View (iPad / Kindle Fire 820x1180)
  console.log('Capturing Field App Tablet Views...');
  const tabletContext = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const tabletPage = await tabletContext.newPage();
  try {
    await tabletPage.goto('http://localhost:8000/field/index.html', { waitUntil: 'networkidle', timeout: 15000 });
    await tabletPage.waitForTimeout(2500);
    await tabletPage.screenshot({ path: path.join(outDir, 'field_tablet_scan.png') });

    // Click on Work Orders rail item (x ~ 40, y ~ 260)
    await tabletPage.mouse.click(40, 260);
    await tabletPage.waitForTimeout(1200);
    await tabletPage.screenshot({ path: path.join(outDir, 'field_tablet_workorders.png') });

    // Click on Turns rail item (x ~ 40, y ~ 340)
    await tabletPage.mouse.click(40, 340);
    await tabletPage.waitForTimeout(1200);
    await tabletPage.screenshot({ path: path.join(outDir, 'field_tablet_turns.png') });
  } catch (err) {
    console.warn('Field tablet capture warning:', err.message);
  }
  await tabletContext.close();

  await browser.close();
  console.log('Complete gallery of HQ and Field app snapshots generated!');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
