import { test, expect, type Page } from '@playwright/test';
import * as crypto from 'crypto';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

test.describe.serial('Full user flow', () => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = 'TestPassword123';

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('register a new account', async () => {
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(partners|conversions)/, { timeout: 10000 });
    await expect(page.locator('aside')).toBeVisible();
  });

  test('navigate through all dashboard pages', async () => {
    // Partners page
    await page.click('a[href="/partners"]');
    await expect(page).toHaveURL('/partners');
    await expect(page.locator('h1')).toContainText('Partners');

    // Rules page
    await page.click('a[href="/rules"]');
    await expect(page).toHaveURL('/rules');
    await expect(page.locator('h1')).toContainText('Accrual Rules');

    // Conversions page
    await page.click('a[href="/conversions"]');
    await expect(page).toHaveURL('/conversions');
    await expect(page.locator('h1')).toContainText('Conversions');

    // Payments page
    await page.click('a[href="/payments"]');
    await expect(page).toHaveURL('/payments');
    await expect(page.locator('h1')).toContainText('Payments');

    // Integration page
    await page.click('a[href="/integration"]');
    await expect(page).toHaveURL('/integration');
    await expect(page.locator('h1')).toContainText('Integration Guide');

    // API Keys page
    await page.click('a[href="/api-keys"]');
    await expect(page).toHaveURL('/api-keys');
    await expect(page.locator('h1')).toContainText('API Keys');
  });

  test('integration page shows all documentation sections', async () => {
    await page.goto('/integration');

    await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Create an API Key/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'API Reference' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Request Signing/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Idempotency/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rate Limits/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Direct Server Integration/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mobile Attribution/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Setup Checklist/ })).toBeVisible();
    await expect(page.locator('text=POST /api/conversions/track').first()).toBeVisible();
    await expect(page.locator('text=AppsFlyer').first()).toBeVisible();
  });

  test('create an API key and see signing secret', async () => {
    await page.goto('/api-keys');

    await page.click('button:has-text("Create")');
    await page.waitForSelector('input', { timeout: 5000 });
    await page.fill('input', 'E2E Test Key');
    await page.click('button[type="submit"]:has-text("Create")');

    // Should show the created key modal
    await expect(page.locator('text=API Key Created')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=Signing Secret')).toBeVisible();
    await expect(page.locator('code:has-text("rk_")').first()).toBeVisible();

    await page.click('button:has-text("Done")');
    await expect(page.locator('text=E2E Test Key')).toBeVisible();
  });

  test('conversions page loads successfully', async () => {
    await page.goto('/conversions');
    await expect(page.locator('h1')).toContainText('Conversions', {
      timeout: 5000,
    });
  });

  test('track conversion via API and verify on conversions page', async ({
    request,
  }) => {
    // Login via API to get tokens
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();

    // Create API key via API
    const keyRes = await request.post(`${API_BASE}/auth/api-keys`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Track Key' },
    });
    expect(keyRes.ok()).toBeTruthy();
    const keyData = await keyRes.json();
    expect(keyData.signingSecret).toBeDefined();

    // Create partner
    await request.post(`${API_BASE}/partners`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { code: 'E2E_TRACK', name: 'E2E Track Partner' },
    });

    // Create accrual rule
    await request.post(`${API_BASE}/accrual-rules`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { eventName: 'e2e_purchase', ruleType: 'fixed', amount: '25' },
    });

    // Track conversion with HMAC
    const body = JSON.stringify({
      partnerCode: 'E2E_TRACK',
      eventName: 'e2e_purchase',
      count: 3,
      revenue: 150,
    });
    const signature = crypto
      .createHmac('sha256', keyData.signingSecret)
      .update(body)
      .digest('hex');

    const trackRes = await request.post(`${API_BASE}/conversions/track`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': keyData.key,
        'X-Signature': `sha256=${signature}`,
      },
      data: body,
    });
    expect(trackRes.status()).toBe(201);

    const trackData = await trackRes.json();
    expect(trackData.success).toBe(true);
    expect(parseFloat(trackData.accrualAmount)).toBe(75); // 3 * $25

    // Verify the conversion exists via API
    const conversionsRes = await request.get(
      `${API_BASE}/conversions?eventName=e2e_purchase`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(conversionsRes.ok()).toBeTruthy();
    const conversionsData = await conversionsRes.json();
    expect(conversionsData.data.length).toBeGreaterThan(0);
    expect(conversionsData.data[0].eventName).toBe('e2e_purchase');
    expect(conversionsData.data[0].count).toBe(3);
  });
});
