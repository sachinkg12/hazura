import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders the landing page with title and search', async ({ page }) => {
    await page.goto('/');

    // Title visible
    await expect(page.locator('h1')).toContainText('Know Your Risk');
    await expect(page.locator('h1')).toContainText('Be Prepared');

    // Address input exists
    const input = page.getByPlaceholder(/address/i);
    await expect(input).toBeVisible();

    // Assess Risk button exists but disabled when empty
    const button = page.getByRole('button', { name: /assess hazard risk/i });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test('enables button when address is typed', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder(/address/i);
    await input.fill('123 Main St, San Francisco, CA');

    const button = page.getByRole('button', { name: /assess hazard risk/i });
    await expect(button).toBeEnabled();
  });

  test('shows example address buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('San Francisco, CA')).toBeVisible();
    await expect(page.getByText('Miami, FL')).toBeVisible();
    await expect(page.getByText('Oklahoma City, OK')).toBeVisible();
    await expect(page.getByText('Los Angeles, CA')).toBeVisible();
  });

  test('clicking example populates the input', async ({ page }) => {
    await page.goto('/');

    await page.getByText('San Francisco, CA').click();

    const input = page.getByPlaceholder(/address/i);
    await expect(input).toHaveValue('1 Market St, San Francisco, CA 94105');
  });

  test('shows How It Works section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText('Enter Your Address')).toBeVisible();
    await expect(page.getByText('We Analyze the Data')).toBeVisible();
    await expect(page.getByText('Get Your Profile')).toBeVisible();
  });

  test('shows Prep Plan CTA section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Get Your Personalized Prep Plan')).toBeVisible();
    const ctaLink = page.getByRole('link', { name: /get my plan/i });
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute('href', '/plan');
  });

  test('shows data source attribution', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Powered by federal open data')).toBeVisible();
    await expect(page.getByText('FEMA', { exact: true })).toBeVisible();
    await expect(page.getByText('USGS', { exact: true })).toBeVisible();
    await expect(page.getByText('NOAA', { exact: true })).toBeVisible();
  });

  test('footer has all navigation links', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer.getByText('Prep Plan')).toBeVisible();
    await expect(footer.getByText('Compare Addresses')).toBeVisible();
    await expect(footer.getByText('Methodology')).toBeVisible();
    await expect(footer.getByText('GitHub')).toBeVisible();
  });

  test('navigates to profile page on form submit', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder(/address/i);
    await input.fill('100 Biscayne Blvd, Miami, FL 33132');

    const button = page.getByRole('button', { name: /assess hazard risk/i });
    await button.click();

    // Should navigate to /profile with address param
    await expect(page).toHaveURL(/\/profile\?address=/);
  });
});
