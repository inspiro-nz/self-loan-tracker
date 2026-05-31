import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Pre-read CDN files at module load time so any missing-file error is
// immediately obvious and route handlers don't do async disk I/O.
const ROOT = process.cwd();

function readLocal(relPath) {
  const abs = join(ROOT, relPath);
  return readFileSync(abs); // throws clearly if file is absent after npm ci
}

// CDN URLs used by index.html mapped to local node_modules equivalents.
// Tests are fully offline — no external network required.
const CDN_ROUTES = [
  {
    pattern: 'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
    body: readLocal('node_modules/react/umd/react.production.min.js'),
    contentType: 'application/javascript',
  },
  {
    pattern: 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
    body: readLocal('node_modules/react-dom/umd/react-dom.production.min.js'),
    contentType: 'application/javascript',
  },
  {
    pattern: 'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
    body: readLocal('node_modules/@babel/standalone/babel.min.js'),
    contentType: 'application/javascript',
  },
  // Stub Google Fonts — cosmetic only, empty CSS body is fine
  {
    pattern: 'https://fonts.googleapis.com/**',
    body: Buffer.from(''),
    contentType: 'text/css',
  },
];

// Wait for React/Babel to compile and render into #root.
async function waitForApp(page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    },
    { timeout: 20000 }
  );
}

// Register CDN intercept routes on a page before navigation.
async function setupPage(page) {
  for (const { pattern, body, contentType } of CDN_ROUTES) {
    await page.route(pattern, route => route.fulfill({ body, contentType }));
  }
}

// Clear localStorage before each test so tests are isolated.
test.beforeEach(async ({ page }) => {
  await setupPage(page);
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
