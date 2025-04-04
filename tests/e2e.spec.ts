import { test, expect } from '@playwright/test';



test("Insert 10 + 10", async ({ page }) => {
  // Navigate to your page
  await page.goto('http://localhost:5173/');

  // Target the specific cell using its ID
  const cell = page.locator('div#C2.Cell');

  // Verify the cell exists and is visible
  await expect(cell).toBeVisible();

  await cell.click();

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');

  await cell.type('= 10 * 10');

  await page.keyboard.press('Enter');

  await expect(cell).toContainText('100');

  const cell2 = page.locator('div#A2.Cell');
  await expect(cell).toBeVisible();

  await cell2.click();

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');

  await cell2.type('= C2 + 1');

  await page.keyboard.press('Enter');

  await expect(cell2).toContainText('101');

});

