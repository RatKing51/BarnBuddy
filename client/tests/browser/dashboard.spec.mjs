import { expect, test } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { dashboardScreenshot, sampleFarm, sessionFile } from './dashboard-env.mjs';

const visible = locator => locator.filter({ visible: true });
const facts = page => page.getByRole('region', { name: 'Herd quick facts' });
const toolbar = page => page.locator('.bb-dashboard-toolbar');
const phoneWidth = page => page.viewportSize().width < 768;
const herd = page => page.getByRole('combobox', { name: 'Herd', exact: true });
const headings = page => page.getByRole('heading', { level: 1 });
const fonts = page => headings(page).evaluate(heading => ({
  heading: getComputedStyle(heading).fontFamily,
  body: getComputedStyle(heading.closest('main')).fontFamily,
}));
const palette = page => page.locator('.bb-livestock').evaluate(workspace => {
  const theme = getComputedStyle(workspace);
  return ['--work-bg', '--work-panel', '--work-raised', '--work-line'].map(name => theme.getPropertyValue(name));
});
const screenshot = async (page, info, name) => {
  await expect(page.locator('.bb-loading-bar')).toHaveCount(0);
  await page.screenshot({ path: dashboardScreenshot(info.project.name, name), animations: 'disabled' });
};

async function openFarmTool(page, name) {
  const nav = visible(page.getByRole('navigation', { name: 'Farm navigation' }));
  await expect(nav).toBeVisible();
  const link = nav.getByRole('link', { name, exact: true });
  if (!await link.isVisible()) await nav.getByRole('button', { name: 'More' }).click();
  await link.or(nav.getByRole('button', { name, exact: true })).click();
}

async function openAnimalTab(page, name) {
  const nav = visible(page.getByRole('navigation', { name: 'Animal records' }));
  await expect(nav).toBeVisible();
  const tab = nav.getByRole('button', { name, exact: true });
  if (!await tab.isVisible()) await nav.getByRole('button', { name: 'More' }).click();
  await tab.click();
}

async function checkWorkspaceGutters(page) {
  const gutters = await page.locator('main.dashboard-main').evaluate(main => {
    const pane = main.getBoundingClientRect();
    const content = main.querySelector('[data-tour="records-area"]').getBoundingClientRect();
    return {
      left: Math.round(content.left - pane.left),
      right: Math.round(pane.right - content.right),
      fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  });
  expect(gutters.fits).toBe(true);
  expect(gutters.right).toBe(gutters.left);
  expect(gutters.right).toBeLessThanOrEqual(32);
}

async function checkReachable(control) {
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expectReachable(control);
}

async function expectReachable(control) {
  await expect.poll(() => control.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return element.contains(hit);
  }), { message: `Can reach ${control}` }).toBe(true);
}

async function checkPageWidth(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function createRecord(page, button, endpoint) {
  const clickAndWait = async () => {
    const pending = page.waitForResponse(response => new URL(response.url()).pathname.endsWith(endpoint) &&
      response.request().method() === 'POST', { timeout: 10_000 });
    await button.click();
    return pending;
  };
  let result = await clickAndWait();
  if (result.status() === 429) {
    await delay(1000 * Number(result.headers()['retry-after'] || 2));
    result = await clickAndWait();
  }
  expect(result.ok(), result.ok() ? undefined : (await result.json()).error).toBe(true);
}

async function checkToolbar(page, greeting) {
  const controls = toolbar(page);
  await expect(controls.getByText(greeting, { exact: true })).toBeInViewport();
  await expect(controls.getByRole('button', { name: 'Export', exact: true })).toBeInViewport();
  await expect(controls.getByRole('link', { name: 'Settings', exact: true })).toBeInViewport();
  await expect(controls.getByRole('button', { name: 'Add animal', exact: true })).toBeInViewport();
  await expect(controls.getByRole('button', { name: /open user menu/i })).toBeInViewport();
  if (phoneWidth(page)) await expect(facts(page)).toBeHidden();
  else await expect(facts(page)).toBeInViewport();
}

async function checkScrolledLayout(page, testInfo, name, greeting, menuName = 'More farm tools') {
  const viewport = page.viewportSize();
  const phone = phoneWidth(page);
  const profile = menuName === 'More animal records';
  const distance = phone ? profile ? 260 : 145 : 90;
  const documentHeight = await page.locator('.bb-work-footer').evaluate(element => element.getBoundingClientRect().bottom + window.scrollY);
  // Short fixture lists may fit in the configured height. Keep the width and reduce the height to exercise scrolling.
  if (documentHeight - viewport.height < distance) {
    await page.setViewportSize({ ...viewport, height: Math.max(phone ? 600 : 350, Math.floor(documentHeight - distance)) });
  }
  await page.evaluate(scrollTop => window.scrollTo(0, scrollTop), distance);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  if (phone) {
    await expect(toolbar(page)).not.toBeInViewport();
    await expect(facts(page)).toBeHidden();
  } else {
    await expect.poll(() => toolbar(page).evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
    await checkToolbar(page, greeting);
    await expect(facts(page).locator('dd')).toHaveText(['3', '3', '1', '1']);
  }
  if (profile && !phone) {
    await expect(toolbar(page).getByRole('heading', { name: 'Clover', exact: true })).toBeInViewport({ ratio: 1 });
    for (const tab of ['General', 'Weight', 'Health', 'Vet']) {
      await expect(toolbar(page).getByRole('button', { name: tab, exact: true })).toBeInViewport({ ratio: 1 });
    }
  }
  if (name === 'farm-overview-scrolled') {
    if (phone) {
      await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeInViewport();
    }
    const avatar = toolbar(page).getByRole('button', { name: /open user menu/i });
    await avatar.click();
    const manageAccount = page.getByText('Manage account', { exact: true });
    await expect(manageAccount).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(manageAccount).toBeHidden();
    await page.evaluate(scrollTop => window.scrollTo(0, scrollTop), distance);
  }
  if (phone) {
    await screenshot(page, testInfo, name);
    if (profile) await page.evaluate(() => window.scrollTo(0, 0));
    const more = page.getByRole('button', { name: 'More', exact: true });
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('group', { name: menuName })).toBeVisible();
    await expect(page.getByRole('group', { name: menuName })).toBeInViewport();
    await screenshot(page, testInfo, name + '-menu');
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  } else {
    await screenshot(page, testInfo, name);
  }
  await page.setViewportSize(viewport);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test('signed-in farm walkthrough', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const publicFonts = await fonts(page);
  expect(publicFonts.body).toContain('Inter Variable');
  await page.goto('/dashboard');
  await expect(herd(page)).toBeEnabled();
  await herd(page).selectOption({ label: sampleFarm.north });
  await expect(headings(page)).toHaveText(/Good (morning|afternoon|evening), Casey/);
  const greeting = await headings(page).textContent();
  const dashboardPalette = await palette(page);
  expect(await fonts(page)).toEqual(publicFonts);
  const careLink = page.getByRole('link', { name: /1 vaccination is due.*North Pasture/ });
  await expect(careLink).toBeVisible();
  const northFarmURL = new URL(page.url());
  if (phoneWidth(page)) await expect(facts(page)).toBeHidden();
  else await expect(facts(page).locator('dd')).toHaveText(['3', '3', '1', '1']);
  const attention = page.getByRole('region', { name: 'Needs attention' });
  await expect(attention.getByRole('link', { name: /Clover/ })).toHaveCount(1);
  await expect(attention.getByRole('link', { name: /Clover/ }).locator('.bb-care-label')).toHaveCSS('border-radius', '10px');
  await expect(attention.getByRole('link', { name: /Milo/ })).toHaveCount(0);
  const shortcuts = page.getByRole('navigation', { name: 'Animal shortcuts' });
  await expect(shortcuts).toBeVisible();
  await checkWorkspaceGutters(page);
  await screenshot(page, testInfo, 'farm-overview');
  if (phoneWidth(page)) {
    const strip = shortcuts.getByRole('list');
    expect(await strip.evaluate(list => list.scrollWidth > list.clientWidth)).toBe(true);
    await strip.evaluate(list => list.scrollTo({ left: list.scrollWidth, behavior: 'instant' }));
    await expect.poll(() => strip.evaluate(list => list.scrollLeft)).toBeGreaterThan(0);
  } else {
    await expect(page.locator('.bb-farm-sidebar').getByRole('navigation', { name: 'Farm navigation' })).toBeVisible();
  }
  await shortcuts.getByRole('link', { name: /Milo/ }).focus();
  await page.keyboard.press('Enter');
  await expect(headings(page)).toHaveText('Milo');
  await page.goBack();
  await expect(page).toHaveURL(northFarmURL.href);
  await checkScrolledLayout(page, testInfo, 'farm-overview-scrolled', greeting);
  await page.evaluate(() => {
    window.print = () => { document.body.dataset.printRequested = 'true'; };
  });
  await toolbar(page).getByRole('button', { name: 'Export' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-requested', 'true');

  await careLink.click();
  await expect(page).toHaveURL(/\/dashboard\/animal\/\d+\?record=health$/);
  await expect(page.getByRole('heading', { name: 'Vaccinations' })).toBeVisible();
  await page.goBack();
  await expect(headings(page)).toHaveText(greeting);

  await openFarmTool(page, 'Animals');
  await expect(page).toHaveURL(/\/dashboard\/animals\?herd=\d+$/);
  await expect(headings(page)).toHaveText('Animals');
  await expect(shortcuts).toBeVisible();
  const directory = page.getByRole('region', { name: 'Animal directory' });
  await expect(directory.getByRole('link', { name: /Clover/ })).toBeVisible();
  await expect(directory.getByRole('link', { name: /Milo/ })).toBeVisible();
  await checkWorkspaceGutters(page);
  await screenshot(page, testInfo, 'animals');
  await checkScrolledLayout(page, testInfo, 'animals-scrolled', greeting);
  const search = page.getByRole('searchbox', { name: 'Search animals' });
  const status = page.getByRole('combobox', { name: 'Status', exact: true });
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(status).toBeFocused();
  await search.fill('NP-014');
  await status.selectOption('yellow');
  const directoryURL = page.url();
  await page.reload();
  await expect(search).toHaveValue('NP-014');
  await expect(status).toHaveValue('yellow');
  await expect(directory.getByRole('link', { name: /Clover/ })).toHaveCount(1);
  await directory.getByRole('link', { name: /Clover/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/animal\/\d+$/);
  await expect(headings(page)).toHaveText('Clover');
  const phone = phoneWidth(page);
  const switchAnimal = page.getByRole('combobox', { name: 'Switch animal' });
  if (phone) {
    await expect(switchAnimal.locator('option:checked')).toHaveText('Clover');
  } else {
    await expect(shortcuts.getByRole('link', { name: /Clover/ })).toHaveAttribute('aria-current', 'page');
  }
  await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
  await checkWorkspaceGutters(page);
  await screenshot(page, testInfo, 'animal-profile');
  await checkScrolledLayout(page, testInfo, 'animal-profile-scrolled', greeting, 'More animal records');
  const qrTag = page.getByRole('button', { name: 'QR tag', exact: true });
  await qrTag.click();
  const qrDialog = page.getByRole('dialog', { name: 'QR tag for Clover' });
  await expect(qrDialog).toBeVisible();
  await screenshot(page, testInfo, 'animal-qr-dialog');
  await page.keyboard.press('Escape');
  await expect(qrDialog).toHaveCount(0);
  await expect(qrTag).toBeFocused();
  const recordPanel = page.locator('.bb-profile-panel .bb-view-enter');
  await expect(recordPanel).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    document.addEventListener('animationstart', event => {
      if (new URLSearchParams(location.search).get('record') === 'weight' &&
          event.target.matches('.bb-profile-panel .bb-view-enter')) {
        document.body.dataset.recordAnimation = event.animationName;
      }
    });
    window.scrollTo(0, 400);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await openAnimalTab(page, 'Weight');
  await expect(page.locator('body')).toHaveAttribute('data-record-animation', 'bb-view-in');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (phone) {
    const weighIn = page.getByRole('heading', { name: 'Add Weigh-In' });
    await expect(weighIn).toBeInViewport();
    await page.getByRole('spinbutton', { name: 'Weight', exact: true }).fill('515.25');
    await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('kg');
    const notes = page.getByRole('textbox', { name: 'Notes', exact: true });
    const addWeight = page.getByRole('button', { name: 'Add Weight', exact: true });
    const viewport = page.viewportSize();
    await page.setViewportSize({ ...viewport, height: 420 });
    await notes.fill('Phone walkthrough');
    await checkReachable(notes);
    await checkReachable(addWeight);
    await screenshot(page, testInfo, 'animal-weight-short-viewport');
    await addWeight.click();
    await page.setViewportSize(viewport);
    const saved = page.locator('tr').filter({ has: page.locator('input[aria-label="Recorded weight notes"][value="Phone walkthrough"]') });
    await expect(saved.getByRole('spinbutton', { name: 'Recorded weight' })).toHaveValue('515.25');
    await expect(saved.getByRole('combobox', { name: 'Recorded weight unit' })).toHaveValue('kg');
    expect(await saved.evaluate(row => row.closest('table').scrollWidth <= row.closest('table').parentElement.clientWidth)).toBe(true);
    await checkReachable(saved.getByRole('textbox', { name: 'Recorded weight notes' }));
    await screenshot(page, testInfo, 'animal-weight-history-phone');
    page.once('dialog', dialog => dialog.accept());
    await saved.getByRole('button', { name: 'Delete' }).click();
    await expect(saved).toHaveCount(0);
  }
  await openAnimalTab(page, 'General');
  for (const [tab, heading] of [['Weight', 'History'], ['Health', 'Vaccinations'], ['Vet', 'Vet Visits'], ['Reproduction', 'Reproduction records'], ['Money', 'Finances']]) {
    await openAnimalTab(page, tab);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    await checkToolbar(page, greeting);
    await screenshot(page, testInfo, 'animal-' + tab.toLowerCase());
  }
  if (phone) await switchAnimal.selectOption({ label: 'Juniper' });
  else await shortcuts.getByRole('link', { name: /Juniper/ }).click();
  await expect(headings(page)).toHaveText('Juniper');
  await openAnimalTab(page, 'Vet');
  const visitTotal = page.locator('.bb-vet-total').filter({ hasText: 'Total' });
  await expect(visitTotal).toHaveCSS('border-top-style', 'solid');
  await expect(visitTotal.locator('dd')).toHaveText('1');
  await screenshot(page, testInfo, 'animal-vet-populated');
  if (phone) await switchAnimal.selectOption({ label: 'Milo' });
  else await shortcuts.getByRole('link', { name: /Milo/ }).click();
  await expect(headings(page)).toHaveText('Milo');
  await openAnimalTab(page, 'Weight');
  await expect(page.getByRole('heading', { name: 'Weight Trend' })).toBeVisible();
  await screenshot(page, testInfo, 'animal-weight-populated');
  await page.goBack();
  await expect(page).toHaveURL(directoryURL);
  await expect(status).toHaveValue('yellow');
  await expect(herd(page).locator('option:checked')).toHaveText(sampleFarm.north);
  await shortcuts.getByRole('link', { name: /Clover/ }).click();
  await page.getByRole('button', { name: 'Back to animals' }).click();
  await expect(page).toHaveURL(directoryURL);
  await expect(search).toHaveValue('NP-014');
  await search.clear();
  await status.selectOption('all');
  await herd(page).selectOption({ label: sampleFarm.south });
  await expect(directory.getByRole('link', { name: /Fern/ })).toBeVisible();
  await expect(directory.getByRole('link', { name: /Clover/ })).toHaveCount(0);
  await screenshot(page, testInfo, 'second-herd');

  for (const [label, detail] of [['Feed', 'Feed records'], ['Money', 'Herd ledger'], ['Bulk Entry', 'Choose animals']]) {
    await openFarmTool(page, label);
    await expect(headings(page)).toHaveText(label);
    await expect(page.getByText(detail, { exact: true }).first()).toBeVisible();
    await checkToolbar(page, greeting);
    await checkWorkspaceGutters(page);
    await screenshot(page, testInfo, label.toLowerCase().replaceAll(' ', '-'));
    if (phone && label === 'Feed') {
      await createRecord(page, page.getByRole('button', { name: 'Add first feed record' }), '/premium-records/feed');
      await expect(page.getByRole('textbox', { name: 'Feed type' })).toBeVisible();
      await checkReachable(page.getByPlaceholder('Notes', { exact: true }));
      await screenshot(page, testInfo, 'feed-open-form');
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Feed type' })).toHaveCount(0);
    } else if (phone && label === 'Money') {
      const add = page.getByRole('button', { name: 'Add ledger entry' });
      await checkReachable(add);
      await createRecord(page, add, '/premium-records/finance');
      await expect(page.getByRole('combobox', { name: 'Animal', exact: true })).toBeVisible();
      await checkReachable(page.getByPlaceholder('Notes', { exact: true }));
      await screenshot(page, testInfo, 'money-open-form');
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Animal', exact: true })).toHaveCount(0);
    } else if (phone && label === 'Bulk Entry') {
      await page.getByRole('checkbox', { name: /Fern/ }).check();
      await page.getByRole('button', { name: 'Health event', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Event type' })).toBeVisible();
      await checkReachable(page.getByRole('textbox', { name: 'Notes', exact: true }));
      await checkReachable(page.getByRole('button', { name: 'Add to 1 animal', exact: true }));
    }
  }

  await openFarmTool(page, 'Inventory');
  await expect(headings(page)).toHaveText('Inventory');
  await checkToolbar(page, greeting);
  const stockList = page.getByRole('region', { name: 'Stock list' });
  await expect(stockList.getByRole('button', { name: /Goat grower pellets/ })).toBeVisible();
  await checkWorkspaceGutters(page);
  if (phone) {
    const right = element => Math.round(element.getBoundingClientRect().right);
    expect(await herd(page).evaluate(right)).toBe(await stockList.evaluate(right));
  }
  await screenshot(page, testInfo, 'inventory');
  const stockSearch = page.getByRole('searchbox', { name: 'Search inventory' });
  await stockSearch.fill('mineral');
  await expect(stockList.getByRole('button', { name: /Goat grower pellets/ })).toHaveCount(0);
  await stockList.getByRole('button', { name: /Mineral mix.*Low stock/ }).click();
  await expect(page.getByRole('heading', { name: 'Mineral mix', exact: true })).toBeVisible();
  await herd(page).selectOption({ label: sampleFarm.north });
  await expect(page.getByRole('heading', { name: 'No inventory items yet' })).toBeVisible();
  await screenshot(page, testInfo, 'inventory-empty');
  await createRecord(page, page.getByRole('button', { name: 'Add item', exact: true }), '/premium-records/inventory');
  await expect(page.getByRole('heading', { name: 'New item', exact: true })).toBeVisible();
  const onHand = page.getByRole('region', { name: 'Stock adjustment' }).getByText('1 each', { exact: true });
  await page.getByRole('button', { name: 'Restock', exact: true }).click();
  await expect(onHand).toBeVisible();
  await page.getByRole('button', { name: 'Use stock', exact: true }).click();
  await expect(onHand).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No inventory items yet' })).toBeVisible();
  if (testInfo.project.name.endsWith('desktop')) {
    const viewport = page.viewportSize();
    await page.setViewportSize({ ...viewport, width: 2200 });
    await checkWorkspaceGutters(page);
    await openFarmTool(page, 'Animals');
    await checkWorkspaceGutters(page);
    await page.setViewportSize(viewport);
  }

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(headings(page)).toHaveText('Account settings');
  expect(await palette(page)).toEqual(dashboardPalette);
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('dark');
  await expect(page.getByLabel('Loading FFA chapter status')).toHaveCount(0);
  await screenshot(page, testInfo, 'account-settings');
  const settingsNav = page.getByRole('navigation', { name: 'Settings navigation' });
  await settingsNav.getByRole('link', { name: 'Herds', exact: true }).click();
  await expect(headings(page)).toHaveText('Your herds');
  await expect(page.getByRole('navigation', { name: 'Your herds' }).getByRole('button', { name: /North Pasture/ })).toBeVisible();
  await screenshot(page, testInfo, 'herd-settings');
  await page.getByRole('button', { name: 'Add herd', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add a herd' })).toBeVisible();
  await screenshot(page, testInfo, 'add-herd-dialog');
  if (phone) {
    const herdDialog = page.getByRole('dialog', { name: 'Add a herd' });
    await checkReachable(herdDialog.getByRole('textbox', { name: /Description/ }));
    await checkReachable(herdDialog.getByRole('button', { name: 'Create herd' }));
    await herdDialog.getByRole('button', { name: 'Close add herd dialog' }).click();
  } else {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('button', { name: 'Add herd', exact: true })).toBeFocused();

  await settingsNav.getByRole('link', { name: 'Import Assistant' }).click();
  await expect(headings(page)).toHaveText('Import Assistant');
  await expect(page.getByRole('heading', { name: 'I already have a CSV' })).toBeVisible();
  await screenshot(page, testInfo, 'import-assistant');
  const csvChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose CSV file' }).click();
  await (await csvChooser).setFiles({
    name: 'sample-livestock.csv', mimeType: 'text/csv', buffer: Buffer.from('name,species,tagId\nHazel,Goat,PREVIEW-001\n'),
  });
  await expect(page.getByRole('heading', { name: 'Review the CSV rows' })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: 'Name (optional)', exact: true })).toHaveValue('Hazel');
  await screenshot(page, testInfo, 'import-csv-review');
  if (phone) {
    await checkReachable(page.getByRole('textbox', { name: 'Tag ID', exact: true }));
    await checkReachable(page.getByRole('button', { name: 'Remove', exact: true }));
    await checkPageWidth(page);
  }
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await openFarmTool(page, 'FFA Projects');
  await expect(headings(page)).toHaveText('FFA Project Mode');
  expect(await palette(page)).toEqual(dashboardPalette);
  await expect(page.getByRole('heading', { name: sampleFarm.project, exact: true }).first()).toBeVisible();
  await screenshot(page, testInfo, 'ffa-projects');
  const projectNav = page.getByRole('navigation', { name: 'FFA project sections' });
  for (const [tab, heading] of [['Journal', 'Add journal activity'], ['Finances', 'Project ledger'], ['Setup', 'Project details']]) {
    await projectNav.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await screenshot(page, testInfo, 'ffa-' + tab.toLowerCase());
  }
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Start a project' })).toBeVisible();
  await screenshot(page, testInfo, 'ffa-project-dialog');
  if (phone) {
    const projectDialog = page.getByRole('dialog', { name: 'Start a project' });
    const goals = projectDialog.getByRole('textbox', { name: /^Goals/ });
    const submit = projectDialog.getByRole('button', { name: 'Create FFA project' });
    await goals.focus();
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 410 });
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    try {
      await expect(projectDialog).toHaveCSS('height', '410px');
      await goals.evaluate(element => {
        const fields = element.closest('.bb-project-dialog-fields');
        fields.scrollTop += element.getBoundingClientRect().top - fields.getBoundingClientRect().top - 12;
      });
      await expectReachable(goals);
      await expectReachable(submit);
      const submitBounds = await submit.boundingBox();
      expect(submitBounds.y + submitBounds.height).toBeLessThanOrEqual(410);
      await screenshot(page, testInfo, 'ffa-project-short-viewport');
    } finally {
      await page.evaluate(() => {
        delete window.visualViewport.height;
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
    }
    await projectDialog.getByRole('button', { name: 'Close', exact: true }).click();
  } else {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('dialog', { name: 'Start a project' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New project', exact: true })).toBeFocused();

  northFarmURL.searchParams.set('tour', '1');
  await page.goto(northFarmURL.href);
  await expect(herd(page).locator('option:checked')).toHaveText(sampleFarm.north);
  const tour = page.getByRole('region', { name: 'Dashboard tour' });
  for (const action of ['Show Farm Overview', 'Check current herd', 'Open first animal']) {
    await tour.getByRole('button', { name: action, exact: true }).click();
    await tour.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await tour.getByRole('button', { name: 'Show Animals', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/animals\?/);
  await expect(page.getByRole('region', { name: 'Animal directory' })).toBeVisible();
  await screenshot(page, testInfo, 'animals-tour');
  await tour.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(tour).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('free access, theme preferences, onboarding, and adding an animal', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport, storageState: sessionFile('free') });
  try {
    const page = await context.newPage();
    await page.goto('/dashboard/ffa-projects');
    await expect(headings(page)).toHaveText('FFA Project Mode is a Premium feature');
    await screenshot(page, testInfo, 'ffa-free');
    await page.getByRole('link', { name: 'Back to dashboard' }).click();
    await expect(headings(page)).toHaveText(/Robin/);
    await expect(page.getByText('Default Herd has no animals yet.')).toBeVisible();
    await openFarmTool(page, 'Feed');
    await expect(page.getByRole('heading', { name: 'Herd feed is a Premium feature' })).toBeVisible();
    await toolbar(page).getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page).toHaveURL(/\/pricing$/);
    await page.goBack();
    await expect(headings(page)).toHaveText('Feed');
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
    const saveTheme = async value => {
      const saving = page.waitForResponse(response => response.url().endsWith('/auth/preferences') && response.request().method() === 'PATCH');
      await theme.selectOption(value);
      expect((await saving).ok()).toBe(true);
    };
    await saveTheme('light');
    await page.reload();
    await expect(theme).toHaveValue('light');
    await expect(page.locator('html')).toHaveClass(/bb-light/);
    await screenshot(page, testInfo, 'account-light');
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(headings(page)).toHaveText(/Robin/);
    await expect(page.locator('html')).toHaveClass(/bb-light/);
    await screenshot(page, testInfo, 'farm-overview-light');
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await saveTheme('dark');
    await page.getByRole('button', { name: 'Restart onboarding' }).click();
    await expect(headings(page)).toHaveText('What best describes you?');
    await screenshot(page, testInfo, 'onboarding');
    for (const option of [/^FFA \/ 4-H student/, /^Cattle/, /^1-5/, /^Manage show animals/, /^Explore the dashboard first/]) {
      const choice = page.getByRole('button', { name: option });
      if (await choice.getAttribute('aria-pressed') !== 'true') await choice.click();
      await page.getByRole('button', { name: /^(Continue|Finish setup)$/ }).click();
    }
    await expect(page).toHaveURL(/\/dashboard\?tour=1$/);
    await expect(page.getByRole('region', { name: 'Dashboard tour' })).toBeVisible();
    await page.getByRole('region', { name: 'Dashboard tour' }).getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(headings(page)).toHaveText(/Robin/);
    await openFarmTool(page, 'Animals');
    await page.getByRole('button', { name: 'Add animal', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/animal\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
    if (phoneWidth(page)) {
      const longName = 'Juniper Ridge Reserve Grand Champion';
      await page.getByPlaceholder('Animal name').fill(longName);
      await page.getByPlaceholder('Animal name').press('Tab');
      await expect(headings(page)).toHaveText(longName);
      await checkPageWidth(page);
      await expect(headings(page)).toBeInViewport({ ratio: 1 });
      await screenshot(page, testInfo, 'animal-profile-long-name');
    }
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /^Delete / }).click();
    await expect(page).toHaveURL(/\/dashboard\/animals$/);
    await expect(page.getByRole('heading', { name: 'No animals in this herd' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('failed care requests do not report an all-clear', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(herd(page)).toBeEnabled();
  await page.route('**/api/animals/herd/*/care-summary?*', route => route.abort());
  await herd(page).selectOption({ label: sampleFarm.south });
  await expect(page.locator('.bb-herd-message')).toHaveText('Care records couldn’t load.');
  if (phoneWidth(page)) await expect(facts(page)).toBeHidden();
  else await expect(facts(page).locator('dd')).toHaveText(['2', '2', '—', '—']);
});
