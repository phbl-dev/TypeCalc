import { test, expect } from '@playwright/test';
import * as fs from "node:fs";

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
test("DnD", async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Simplified XML content
  const xmlContent = fs.readFileSync('./extra_files/e2e_1.xml', 'utf8');  // Create file and trigger drop in one step
  await page.evaluate((xml) => {
    // Create the file
    const file = new File([xml], 'test.xml', { type: 'text/xml' });
    const dt = new DataTransfer();
    dt.items.add(file);

    // Create and dispatch the drop event directly
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    });

    // Dispatch on the document since your app likely has a global handler
    document.dispatchEvent(dropEvent);
  }, xmlContent);


  const A1 = page.locator("div#A1.Cell")
  await A1.click()
  await page.keyboard.press("Control+c")

  const B1 = page.locator("div#B1.Cell")
  await B1.click()
  await page.keyboard.press("Control+x")
  await expect(B1).toContainText('10');

  const A2 = page.locator("div#A2.Cell")
  await A2.click()
  await page.keyboard.press("Control+c")

  const C2 = page.locator("div#C2.Cell")
  await C2.click()

  await page.keyboard.press("Control+v")

  await expect(C2).toContainText('20');

  const A3 = page.locator("div#A3.Cell")

  await A3.click()
  await page.hover("div#C3.Cell")
  await page.keyboard.press("F4")

  await page.keyboard.press("F5")




});

test("Copy and cut single cell", async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const C4 = page.locator('div#C4.Cell')
  await C4.click()
  await C4.type("= 10 + 20 * 30")
  await page.keyboard.press("Enter")
  await expect(C4).toContainText('610');
  await C4.click()
  await page.keyboard.press("Control+c")
  const E8 = page.locator('div#E8.Cell')
  await E8.click()
  await page.keyboard.press("Control+x")
  await page.keyboard.press("Enter")
  await expect(C4).toContainText("")
  await expect(E8).toContainText('610');


})
test("Copy and paste single cell", async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const C4 = page.locator('div#C4.Cell')
  await C4.click()
  await C4.type("= 10 + 20 * 30")
  await page.keyboard.press("Enter")
  await expect(C4).toContainText('610');
  await C4.click()
  await page.keyboard.press("Control+c")
  const E8 = page.locator('div#E8.Cell')
  await E8.click()
  await page.keyboard.press("Control+v")
  await page.keyboard.press("Enter")

  await expect(C4).toContainText('610');
  await expect(E8).toContainText('610');

})
test("Copy and cut multiple cells", async ({ page }) => {
  await page.goto('http://localhost:5173/');



  const C4 = page.locator('div#C4.Cell')

  await C4.click()

  await C4.type("= 10 + 20 * 30")

  await page.keyboard.press("Enter")

  await expect(C4).toContainText('610');


  const C6 = page.locator('div#C6.Cell')
  await C6.click()
  await C6.type("= 10 + 20 + 30")

  await page.keyboard.press("Enter")
  await expect(C6).toContainText('60');


  await C4.click()

  await page.keyboard.down("Shift")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")

  await page.keyboard.up("Shift")


  await page.keyboard.down("Control")
  await page.keyboard.press("c")


  await page.keyboard.up("Control")


  const E8 = page.locator('div#E8.Cell')
  const E10 = page.locator('div#E10.Cell')


  await E8.click()

  await page.keyboard.down("Control")
  await page.keyboard.press("x")


  await page.keyboard.up("Control")


  await expect(E8).toContainText('610');

  await expect(E10).toContainText('60');

  await expect(C4).toContainText('');
  await expect(C6).toContainText('');

})
test("Copy and paste multiple cells", async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const C4 = page.locator('div#C4.Cell')

  await C4.click()

  await C4.type("= 10 + 20 * 30")

  await page.keyboard.press("Enter")

  await expect(C4).toContainText('610');


  const C6 = page.locator('div#C6.Cell')
  await C6.click()
  await C6.type("= 10 + 20 + 30")

  await page.keyboard.press("Enter")
  await expect(C6).toContainText('60');


  await C4.click()

  await page.keyboard.down("Shift")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")

  await page.keyboard.up("Shift")


  await page.keyboard.down("Control")
  await page.keyboard.press("c")


  await page.keyboard.up("Control")


  const E8 = page.locator('div#E8.Cell')
  const E10 = page.locator('div#E10.Cell')


  await E8.click()

  await page.keyboard.down("Control")
  await page.keyboard.press("v")


  await page.keyboard.up("Control")


  await expect(E8).toContainText('610');

  await expect(E10).toContainText('60');

  await expect(C4).toContainText('610');
  await expect(C6).toContainText('60');

})

test("Copy and cut multiple cells with cell refs", async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const C4 = page.locator('div#C4.Cell')
  await C4.click()
  await C4.type("=A1")
  await page.keyboard.press("Enter")
  await expect(C4).toContainText('=A1');
  await C4.click()
  await page.keyboard.down("Shift")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")

  await page.keyboard.up("Shift")
  await page.keyboard.down("Control")
  await page.keyboard.press("c")


  await page.keyboard.up("Control")

  const C5 = page.locator('div#C5.Cell')
  await C5.click()

  await page.keyboard.down("Control")
  await page.keyboard.press("v")


  await page.keyboard.up("Control")


  const A1 = page.locator('div#A1.Cell')

  await A1.click()
  await A1.type("= 10")
  await page.keyboard.press("Enter")

  await expect(C4).toContainText('10');
  await expect(A1).toContainText('10');


})