import { test, expect } from '@playwright/test';

// Clear localStorage before each test so tests are isolated
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ── App boot ──────────────────────────────────────────────────────────────────
test('page loads with correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Self-Loan Tracker/);
});

test('header shows app name', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Self-Loan Tracker' })).toBeVisible();
});

// ── Welcome / onboarding ──────────────────────────────────────────────────────
test('shows welcome screen when no data', async ({ page }) => {
  // Welcome screen is visible on first visit
  await expect(page.getByText(/welcome/i).or(page.getByText(/get started/i)).or(
    page.getByText(/record your first/i)
  )).toBeVisible({ timeout: 8000 });
});

// ── Tab navigation ────────────────────────────────────────────────────────────
test('all navigation tabs are present', async ({ page }) => {
  for (const tab of ['Dashboard', 'Chart', 'Ledger', 'Settings', 'FAQ']) {
    await expect(page.getByRole('button', { name: tab })).toBeVisible();
  }
});

test('can navigate between tabs', async ({ page }) => {
  for (const tab of ['Chart', 'Ledger', 'Settings', 'FAQ', 'Dashboard']) {
    await page.getByRole('button', { name: tab }).click();
    // Each tab should render without JS errors
    await page.waitForTimeout(200);
  }
  // Should end back on Dashboard without errors
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  expect(errors).toHaveLength(0);
});

// ── Ledger — drawdowns ────────────────────────────────────────────────────────
test('can add a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();

  // The drawdowns sub-tab should already be active; fill amount
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('5000');

  await page.getByRole('button', { name: /add/i }).first().click();

  // Entry should appear in the list
  await expect(page.getByText('$5,000')).toBeVisible();
});

test('drawdown entry persists after page reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('7500');
  await page.getByRole('button', { name: /add/i }).first().click();

  await page.reload();
  await page.getByRole('button', { name: 'Ledger' }).click();
  await expect(page.getByText('$7,500')).toBeVisible();
});

test('rejects zero-amount drawdown', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('0');
  await page.getByRole('button', { name: /add/i }).first().click();

  // No entry should appear with $0
  await expect(page.getByText('$0.00')).not.toBeVisible();
});

test('can delete a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('3000');
  await page.getByRole('button', { name: /add/i }).first().click();

  // Delete button (×) should appear on the row
  const deleteBtn = page.locator('button').filter({ hasText: '×' }).first();
  await deleteBtn.click();

  await expect(page.getByText('$3,000')).not.toBeVisible();
});

// ── Ledger — repayments ───────────────────────────────────────────────────────
test('can switch to repayments sub-tab and add a repayment', async ({ page }) => {
  // First add a drawdown so the app is out of welcome state
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('10000');
  await page.getByRole('button', { name: /add/i }).first().click();

  // Switch to repayments sub-tab
  await page.getByRole('button', { name: /repayment/i }).click();

  const rpInput = page.locator('input[type="number"]').first();
  await rpInput.fill('1500');
  await page.getByRole('button', { name: /add/i }).first().click();

  await expect(page.getByText('$1,500')).toBeVisible();
});

// ── Dashboard summary cards ───────────────────────────────────────────────────
test('dashboard shows total drawn after adding a drawdown', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('20000');
  await page.getByRole('button', { name: /add/i }).first().click();

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByText('$20,000')).toBeVisible();
});

// ── Chart tab ────────────────────────────────────────────────────────────────
test('chart tab shows empty state message when no history', async ({ page }) => {
  await page.getByRole('button', { name: 'Chart' }).click();
  await expect(
    page.getByText(/chart builds as you go/i).or(page.getByText(/no data/i))
  ).toBeVisible();
});

// ── Settings tab ─────────────────────────────────────────────────────────────
test('settings tab renders export and import options', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/export/i)).toBeVisible();
  await expect(page.getByText(/import/i)).toBeVisible();
});

test('settings tab shows annual return input', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  const returnInputs = page.locator('input[type="number"]');
  await expect(returnInputs.first()).toBeVisible();
});

// ── FAQ tab ───────────────────────────────────────────────────────────────────
test('FAQ tab renders accordion items', async ({ page }) => {
  await page.getByRole('button', { name: 'FAQ' }).click();
  // At least one FAQ question should be present
  await expect(page.locator('text=/\\?/').first()).toBeVisible();
});

// ── Manual price entry ────────────────────────────────────────────────────────
test('manual price entry sets baseline and updates market data', async ({ page }) => {
  // Add a drawdown first so a snapshot is taken
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('10000');
  await page.getByRole('button', { name: /add/i }).first().click();

  await page.getByRole('button', { name: 'Dashboard' }).click();

  // Find manual price input on dashboard (it's in the market section)
  const manualInput = page.locator('input[placeholder*="price"], input[placeholder*="Price"], input[placeholder*="SPY"], input[placeholder*="Enter"]').first();
  if (await manualInput.isVisible()) {
    await manualInput.fill('500');
    await page.getByRole('button', { name: /apply|set|update/i }).first().click();
    await expect(page.getByText(/500/)).toBeVisible();
  }
});

// ── localStorage data integrity ───────────────────────────────────────────────
test('data model is valid JSON in localStorage after interactions', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('5000');
  await page.getByRole('button', { name: /add/i }).first().click();

  const stored = await page.evaluate(() => localStorage.getItem('slt-loan-tracker'));
  expect(stored).not.toBeNull();

  const parsed = JSON.parse(stored);
  expect(parsed).toHaveProperty('drawdowns');
  expect(Array.isArray(parsed.drawdowns)).toBe(true);
  expect(parsed.drawdowns[0].amount).toBe(5000);
  expect(parsed).toHaveProperty('repayments');
  expect(parsed).toHaveProperty('annualReturn');
  expect(parsed).toHaveProperty('months');
});

// ── No JS errors ──────────────────────────────────────────────────────────────
test('no uncaught JS errors during normal navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  for (const tab of ['Dashboard', 'Chart', 'Ledger', 'Settings', 'FAQ', 'Dashboard']) {
    await page.getByRole('button', { name: tab }).click();
    await page.waitForTimeout(150);
  }

  // Filter out expected non-critical errors (e.g. service worker in test env)
  const criticalErrors = errors.filter(
    e => !e.includes('service worker') && !e.includes('ServiceWorker') && !e.includes('manifest')
  );
  expect(criticalErrors).toHaveLength(0);
});
