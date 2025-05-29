import { beforeEach, describe, expect, test } from "vitest";
import { Sheet } from "../src/back-end/Sheet";
import { Workbook } from "../src/back-end/Workbook";
import { SuperCellAddress } from "../src/back-end/CellAddressing";
import { BlankCell, NumberCell } from "../src/back-end/Cells";

describe("Sheet Testing", () => {
  let sheet: Sheet;

  beforeEach(() => {
    sheet = new Sheet(new Workbook(), "sheet1", 100, 100, true);
  });

  test("Should be able to create a new sheet", () => {
    expect(sheet).toBeDefined;
  });

  test("Ensure that sheet is defined with correct number of Rows and Cols", () => {
    expect(sheet.Rows === 100 && sheet.cols === 100).toBeTruthy();
  });

  test("insert a value to the sheet", () => {
    const cellAddress: SuperCellAddress = new SuperCellAddress(1, 2);
    const cellToAdd = new NumberCell(10);
    sheet.Set(cellAddress, cellToAdd);

    console.log(cellAddress.toString());
    console.log();

    //expect(sheet.ShowValue(1, 2).search("10")).toBe(9); // should return 9 as that is where the value 10 is found at (index-wise)
  });

  test.skip("remove a value from the sheet", () => {
    const cellAddress: SuperCellAddress = new SuperCellAddress(1, 2);

    sheet.Set(cellAddress, new NumberCell(10));

    expect(sheet.ShowValue(1, 2).search("10")).toBe(9);

    sheet.ResetCellState();

    expect(sheet.ShowValue(1, 2).search("10")).toBeNull;
  });

  test.skip("insertion of rows", () => {
    const cellAddress: SuperCellAddress = new SuperCellAddress(2, 2);
    const nc: NumberCell = new NumberCell(10);
    sheet.Set(cellAddress, nc);

    sheet.InsertRowsCols(2, 2, true);

    expect(sheet.Show(2, 4)).toBe("10");
    expect(sheet.Show(2, 2)).toBe("");
  });
});
