import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('about/methodology page loads', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('h1')).toContainText('Methodology');
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Composite Score Calculation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Risk Level Classification' })).toBeVisible();
  });

  test('plan page loads with quiz form', async ({ page }) => {
    await page.goto('/plan');

    await expect(page.locator('h1')).toContainText('Get Your Prep Plan');
    await expect(page.getByText('Where do you live?')).toBeVisible();
  });

  test('plan page accepts address and navigates steps', async ({ page }) => {
    await page.goto('/plan');

    // Step 0: Address
    const input = page.getByPlaceholder(/address/i);
    await input.fill('1 Market St, San Francisco, CA 94105');

    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();

    // Step 1: Household
    await expect(page.getByText('Who lives with you?')).toBeVisible();
    await nextButton.click();

    // Step 2: Medical
    await expect(page.getByText('Medical needs')).toBeVisible();
    await nextButton.click();

    // Step 3: Housing
    await expect(page.getByText('Housing & transportation')).toBeVisible();

    // Should show Generate button on last step
    const generateButton = page.getByRole('button', { name: /generate my plan/i });
    await expect(generateButton).toBeVisible();
  });

  test('compare page loads', async ({ page }) => {
    await page.goto('/compare');

    // Should have address inputs for comparison
    await expect(page).toHaveURL('/compare');
  });

  test('profile page redirects to home without address', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to home when no address param
    await expect(page).toHaveURL('/');
  });

  test('plan page pre-fills address from query param', async ({ page }) => {
    await page.goto('/plan?address=123+Main+St');

    const input = page.getByPlaceholder(/address/i);
    await expect(input).toHaveValue('123 Main St');
  });
});
