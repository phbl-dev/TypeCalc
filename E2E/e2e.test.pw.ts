import { test, expect } from '@playwright/test';




test("Insert C2 = 10 * 10, A2 = C2 + 1", async ({ page }) => {
  // Navigate to your page
  await page.goto('http://localhost:5173/');

  const cell = page.locator('div#C2.Cell');

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

test("Sum of A1... A5", async ({ page }) => {
  await page.goto('http://localhost:5173/');

  const A1 = page.locator('div#A1.Cell');

  await A1.click();

  await A1.type("1")

  const A2 = page.locator('div#A2.Cell');

  await A2.click();

  await A2.type("1")


  const A3 = page.locator('div#A3.Cell');

  await A3.click();

  await A3.type("1")

  const A4 = page.locator('div#A4.Cell');
  await A4.click();
  await A4.type("1")
  const A5 = page.locator('div#A5.Cell');
  await A5.click();
  await A5.type("1")

  const A6 = page.locator('div#A6.Cell');

  await A6.click()

  await A6.type("=SUM(A1:A5)")

  await page.keyboard.press('Enter');

  await expect(A6).toContainText('5');

})



test("CHOOSE", async ({ page }) => {
  // Navigate to your page
  await page.goto('http://localhost:5173/');

  const A1 = page.locator('div#A1.Cell');

  await A1.click();

  await A1.type("=SUM(CHOOSE(1,10,20,30))")

  await page.keyboard.press('Enter');

  await expect(A1).toContainText('10');


})

test("FREQUENCY", async ({ page }) => {
  await page.goto('http://localhost:5173/');

  const A1 = page.locator('div#A1.Cell');
  await A1.click();
  await A1.type("1")


  const A2 = page.locator('div#A2.Cell');

  await A2.click();
  await A2.type("2")


  const A3 = page.locator('div#A3.Cell');

  await A3.click();
  await A3.type("3")

  const A4 = page.locator('div#A4.Cell');

  await A4.click();
  await A4.type("4")

  const A5 = page.locator('div#A5.Cell');

  await A5.click();
  await A5.type("5")

  const A6 = page.locator('div#A6.Cell');

  await A6.click();
  await A6.type("6")

  const A7 = page.locator('div#A7.Cell');

  await A7.click();
  await A7.type("7")


  const A8 = page.locator('div#A8.Cell');

  await A8.click();
  await A8.type("8")

  const A9 = page.locator('div#A9.Cell');

  await A9.click();
  await A9.type("9")

  const A10 = page.locator('div#A10.Cell');
  const A11 = page.locator('div#A11.Cell');
  const A12 = page.locator('div#A12.Cell');


  await A10.click();
  await A10.type("=FREQUENCY([A1:A9], [2,4])")


  await page.keyboard.press('Enter');

  await expect(A10).toContainText('2');
  await expect(A11).toContainText('2');
  await expect(A12).toContainText('5');


})
