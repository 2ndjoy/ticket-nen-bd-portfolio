const { test, expect } = require('@playwright/test');

async function signIn(page, role) {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('a visitor can find Frames of Sylhet by city', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search events or cities' }).fill('Sylhet');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByRole('link', { name: /Frames of Sylhet/ }).click();
  await expect(page.getByRole('heading', { name: 'Frames of Sylhet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in to reserve' })).toBeEnabled();
});

test('an organiser creates a draft, an admin publishes it and the buyer receives a ticket', async ({ page }) => {
  const title = 'Sylhet portfolio showcase';
  const date = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await signIn(page, 'Organiser');
  await page.getByRole('button', { name: 'Add event' }).click();
  await page.getByLabel('Event title').fill(title);
  await page.getByLabel('City', { exact:true }).fill('Sylhet');
  await page.getByLabel('Start in Bangladesh time').fill(date + 'T15:30');
  await page.getByLabel('Capacity').fill('50');
  await page.getByLabel('Ticket price').fill('200');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText('Draft');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', {name:'Demo sign-in'})).toBeVisible();
  await signIn(page, 'Admin');
  await page.getByRole('button', { name: 'Edit ' + title }).click();
  await page.getByLabel('Visibility').selectOption('Published');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText('Published');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', {name:'Demo sign-in'})).toBeVisible();
  await signIn(page, 'Buyer');
  await expect(page.getByRole('heading', {name:'Ticket wallet'})).toBeVisible();
  await page.getByRole('link', { name: 'Events', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByLabel('Tickets', { exact:true }).fill('2');
  await page.getByRole('button', { name: 'Reserve demo ticket' }).click();
  const reservation = page.locator('article').filter({ hasText: title });
  await reservation.getByRole('button', { name: 'View QR ticket' }).click();
  await expect(reservation.locator('code')).toContainText('TNB-');
});
