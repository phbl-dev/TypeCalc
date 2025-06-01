import { beforeEach, describe, expect, test } from "vitest";
import { Value } from "../src/back-end/Values";
import { Formats } from "../src/back-end/Types";
import { Cell, QuoteCell } from "../src/back-end/Cells";
import { Workbook } from "../src/back-end/Workbook";
import { Sheet } from "../src/back-end/Sheet";

describe("QuoteCell", () => {
    let quoteCell: QuoteCell;
    let workbook: Workbook;
    let sheet: Sheet;
    let fo: Formats;

    beforeEach(() => {
        quoteCell = new QuoteCell("test");
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", true);
        fo = new Formats();
    });

    /**
     * The constructor of QuoteCell can take a string.
     */
    test("Constructor Test 1", () => {
        expect(quoteCell instanceof QuoteCell).toBe(true);
    });

    /**
     * The constructor of QuoteCell gives a warning if the argument is null.
     * TypeScript is strict about the arguments a value can take. Therefore, we
     * use "null as any" to bypass this strictness for this test. The error message
     * stems from the Make() method in TextValue which throws an error if s is null.
     * Note that "Assertion failed" will be seen in the console due to the assertion
     * in the constructor of QuoteCell.
     */
    test("Constructor Test 2", () => {
        expect(() => new QuoteCell(null as any)).toThrowError(
            "s cannot be null",
        );
    });

    /**
     * The constructor of QuoteCell can take another QuoteCell as argument.
     */
    test("Constructor Test 3", () => {
        expect(new QuoteCell(quoteCell)).toBeInstanceOf(QuoteCell);
    });

    /**
     * Eval returns the field value of type Values.
     */
    test("Eval Test", () => {
        expect(quoteCell.Eval(sheet, 0, 0) instanceof Value).toBe(true);
    });

    /**
     * Show returns the field value's value as a string.
     */
    test("Show Test", () => {
        expect(typeof quoteCell.Show(0, 0, fo)).toBe("string");
        expect(quoteCell.Show(0, 0, fo)).toBe("test");
    });

    /**
     * CloneCell returns a new QuoteCell with the same value as this.QuoteCell and has
     * return type Cell.
     */
    test("CloneCell Test", () => {
        expect(quoteCell.CloneCell(0, 0) instanceof Cell).toBe(true);
    });
});
