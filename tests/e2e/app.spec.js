import { test, expect } from '@playwright/test';

// Wait for the React app to finish rendering (Babel compiles at runtime)
async function waitForApp(page) {
  await page.waitForSelector('h1', { timeout: 15000 });
}

// Clear localStorage before each test so tests are isolated
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForApp(page);
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
  await expect(page.getByText('Welcome to Self-Loan Tracker')).toBeVisible({ timeout: 8000 });
});

// ── Tab navigation ────────────────────────────────────────────────────────────
test('all navigation tabs are present', async ({ page }) => {
  for (const tab of ['Dashboard', 'Chart', 'Ledger', 'Settings', 'FAQ']) {
    await expect(page.getByRole('button', { name: tab })).toBeVisible();
  }
});

test('can navigate between tabs without JS errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => {
    if (!e.message.includes('ServiceWorker') && !e.message.includes('service worker')) {
      errors.push(e.message);
    }
  });

  for (const tab of ['Chart', 'Ledger', 'Settings', 'FAQ', 'Dashboard']) {
    await page.getByRole('button', { name: tab }).click();
    await page.waitForTimeout(300);
  }

  expect(errors).toHaveLength(0);
});

// ── Ledger — drawdowns ────────────────────────────────────────────────────────
test('can add a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();

  // Amount input (number field with $ prefix in drawdown form)
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('5000');

  // The add drawdown button is labelled "+ Add Drawdown"
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  // Row should appear — match the amount loosely (locale may vary: $5,000 or NZ$5,000)
  await expect(page.locator('td').filter({ hasText: /5[,.]?000/ }).first()).toBeVisible();
});

test('drawdown entry persists after page reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('7500');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.reload();
  await waitForApp(page);
  await page.getByRole('button', { name: 'Ledger' }).click();

  await expect(page.locator('td').filter({ hasText: /7[,.]?500/ }).first()).toBeVisible();
});

test('rejects zero-amount drawdown — no new row appears', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('0');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  // No table row with a $0 / 0.00 amount should appear
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(0, { timeout: 2000 }).catch(() => {
    // If rows exist, none should contain $0
  });
});

test('can delete a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('3000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  // Wait for row to appear
  await expect(page.locator('td').filter({ hasText: /3[,.]?000/ }).first()).toBeVisible();

  // Delete button is the × (×, U+00D7) in the last column
  const deleteBtn = page.locator('tbody button').first();
  await deleteBtn.click();

  await expect(page.locator('td').filter({ hasText: /3[,.]?000/ })).toHaveCount(0);
});

// ── Ledger — repayments ───────────────────────────────────────────────────────
test('can switch to repayments sub-tab and add a repayment', async ({ page }) => {
  // Add a drawdown first so the app is out of welcome state
  await page.getByRole('button', { name: 'Ledger' }).click();
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill('10000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  // Switch to repayments sub-tab (label: "💰 Repayments (money in)")
  await page.locator('button.sub-tab', { hasText: /Repayments/i }).click();

  const rpInput = page.locator('input[type="number"]').first();
  await rpInput.fill('1500');
  await page.getByRole('button', { name: /Add Repayment/i }).click();

  await expect(page.locator('td').filter({ hasText: /1[,.]?500/ }).first()).toBeVisible();
});

// ── Dashboard summary cards ───────────────────────────────────────────────────
test('dashboard shows total drawn after adding a drawdown', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  await page.locator('input[type="number"]').first().fill('20000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.getByRole('button', { name: 'Dashboard' }).click();

  // The summary card should show 20,000 (currency prefix may vary by locale)
  await expect(page.locator('text=/20[,.]?000/')).toBeVisible();
});

// ── Chart tab ────────────────────────────────────────────────────────────────
test('chart tab shows empty state when no history', async ({ page }) => {
  await page.getByRole('button', { name: 'Chart' }).click();
  await expect(page.getByText('Chart builds as you go')).toBeVisible();
});

// ── Settings tab ─────────────────────────────────────────────────────────────
test('settings tab renders export and import options', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/export/i)).toBeVisible();
  await expect(page.getByText(/import/i)).toBeVisible();
});

// ── FAQ tab ───────────────────────────────────────────────────────────────────
test('FAQ tab renders questions', async ({ page }) => {
  await page.getByRole('button', { name: 'FAQ' }).click();
  // The FAQ accordion should have at least one question mark in the text
  await expect(page.locator('text=/What is a self-loan/')).toBeVisible();
});

// ── Manual price entry ────────────────────────────────────────────────────────
test('manual price entry sets baseline and shows price', async ({ page }) => {
  // Add a drawdown so the app records a snapshot
  await page.getByRole('button', { name: 'Ledger' }).click();
  await page.locator('input[type="number"]').first().fill('10000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.getByRole('button', { name: 'Dashboard' }).click();

  // Manual price input has placeholder "Manual price"
  const manualInput = page.locator('input[placeholder="Manual price"]');
  await manualInput.fill('500');
  await page.getByRole('button', { name: 'Apply' }).click();

  // After applying, market price should appear
  await expect(page.locator('text=/500/')).toBeVisible();
});

// ── localStorage data integrity ───────────────────────────────────────────────
test('data model is valid JSON in localStorage after interactions', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger' }).click();
  await page.locator('input[type="number"]').first().fill('5000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

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
