import { test, expect } from '@playwright/test';

// Wait for React/Babel to compile and render into #root.
// The app loads React/Babel from cdnjs CDN; GitHub Actions has full internet
// access so this resolves in 1-3 s on a warm CDN. Timeout is conservative.
async function waitForApp(page) {
  await page.waitForFunction(
    () => document.getElementById('root')?.children?.length > 0,
    { timeout: 30000 }
  );
}

// Isolate each test: clear localStorage then do a full page reload.
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
  await expect(page.getByRole('heading', { name: 'Self-Loan Tracker', exact: true })).toBeVisible();
});

// ── Welcome / onboarding ──────────────────────────────────────────────────────
test('shows welcome screen when no data', async ({ page }) => {
  await expect(page.getByText('Welcome to Self-Loan Tracker')).toBeVisible();
});

// ── Tab navigation ────────────────────────────────────────────────────────────
test('all navigation tabs are present', async ({ page }) => {
  for (const tab of ['Dashboard', 'Chart', 'Ledger', 'Settings', 'FAQ']) {
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
});

// ── Ledger — drawdowns ────────────────────────────────────────────────────────
test('can add a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('5000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();
  await expect(page.locator('td').filter({ hasText: /5[,.]?000/ }).first()).toBeVisible();
});

test('drawdown persists after page reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('7500');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.reload();
  await waitForApp(page);
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await expect(page.locator('td').filter({ hasText: /7[,.]?500/ }).first()).toBeVisible();
});

test('can delete a drawdown entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('3000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();
  await expect(page.locator('td').filter({ hasText: /3[,.]?000/ }).first()).toBeVisible();
  await page.locator('tbody button').first().click();
  await expect(page.locator('td').filter({ hasText: /3[,.]?000/ })).toHaveCount(0);
});

// ── Ledger — repayments ───────────────────────────────────────────────────────
test('can add a repayment entry', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('10000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.locator('button.sub-tab', { hasText: /Repayments/i }).click();
  await page.locator('input[type="number"]').first().fill('1500');
  await page.getByRole('button', { name: /Add Repayment/i }).click();
  await expect(page.locator('td').filter({ hasText: /1[,.]?500/ }).first()).toBeVisible();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
test('dashboard reflects total drawn', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('20000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText(/20[,.]?000/).first()).toBeVisible();
});

// ── Chart tab ────────────────────────────────────────────────────────────────
test('chart tab shows empty state when no history', async ({ page }) => {
  await page.getByRole('button', { name: 'Chart', exact: true }).click();
  await expect(page.getByText('Chart builds as you go')).toBeVisible();
});

// ── Settings tab ─────────────────────────────────────────────────────────────
test('settings tab has export and import', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: /Export Backup/i })).toBeVisible();
  await expect(page.getByText('⬆ Import Backup (JSON)')).toBeVisible();
});

// ── FAQ tab ───────────────────────────────────────────────────────────────────
test('FAQ tab renders questions', async ({ page }) => {
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  await expect(page.getByText('What is a self-loan?')).toBeVisible();
});

// ── localStorage integrity ────────────────────────────────────────────────────
test('localStorage contains valid data model after adding drawdown', async ({ page }) => {
  await page.getByRole('button', { name: 'Ledger', exact: true }).click();
  await page.locator('input[type="number"]').first().fill('5000');
  await page.getByRole('button', { name: /Add Drawdown/i }).click();

  const stored = await page.evaluate(() => localStorage.getItem('slt-loan-tracker'));
  const parsed = JSON.parse(stored);
  expect(Array.isArray(parsed.drawdowns)).toBe(true);
  expect(parsed.drawdowns[0].amount).toBe(5000);
  expect(Array.isArray(parsed.repayments)).toBe(true);
});
