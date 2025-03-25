import { beforeEach, describe, expect, test } from "vitest";
import { BlankCell } from "../src/Cells";
import { Sheet } from "../src/Sheet";
import { Formats } from "../src/Types";
import { Workbook } from "../src/Workbook";

describe("BlankCell", () => {
    let blankCell: BlankCell;
    let sheet: Sheet;
    let fo: Formats;
    let workbook: Workbook;
    beforeEach(() => {
        blankCell = new BlankCell();
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", true);
        fo = new Formats();
    });

    /*
        Eval() returns null.
     */
    test("Eval", () => {
        expect(blankCell.Eval(sheet, 0, 0)).toBeNull();
    });

    /*
        Show() returns an empty string.
     */
    test("Show", () => {
        expect(blankCell.Show(0, 0, fo)).toEqual("");
    });

    /*
    CloneCell() returns a new BlankCell.
 */
    test("CloneCell", () => {
        expect(blankCell.CloneCell(0, 0)).toBeInstanceOf(BlankCell);
    });
});
