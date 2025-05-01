import { beforeEach, describe, expect, test } from "vitest";
import { Value } from "../src/back-end/Values";
import { Formats } from "../src/back-end/Types";
import { Cell, TextCell} from "../src/back-end/Cells";
import { Workbook } from "../src/back-end/Workbook";
import { Sheet } from "../src/back-end/Sheet";

describe ("TextCell", () => {
    let textCell: TextCell;
    let workbook: Workbook;
    let sheet: Sheet;
    let fo: Formats;

    beforeEach(() => {
        textCell = new TextCell("test");
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", true);
        fo = new Formats();
    });
    /**
     * The constructor of TextCell can take a string.
     */
    test ("Constructor Test 1", () => {
        expect(textCell instanceof TextCell).toBe(true);
    });

    /**
     * The constructor of TextCell gives a warning if the argument is null.
     * TypeScript is strict about the arguments a value can take. Therefore, we
     * use "null as any" to bypass this strictness for this test. The error message
     * stems from the Make() method in TextValue which throws an error if s is null.
     * Note that "Assertion failed" will be seen in the console due to the assertion
     * in the constructor of TextCell.
     */
    test ("Constructor Test 2", () => {
        expect(() => new TextCell(null as any)).toThrowError("s cannot be null");
    });

    /**
     * The constructor of TextCell can take another TextCell as argument.
     */
    test ("Constructor Test 3", () => {
        expect(new TextCell(textCell)).toBeInstanceOf(TextCell);
    });

    /**
     * Eval returns the field value of type Values.
     */
    test ("Eval Test", () => {
        expect(textCell.Eval(sheet, 0, 0) instanceof Value).toBe(true);
    })

    /**
     * Show returns the field value's value as a string.
     */
    test ("Show Test", () => {
        expect(typeof textCell.Show(0, 0, fo)).toBe("string");
        expect(textCell.Show(0, 0, fo)).toBe("\"test\"");
    })

    /**
     * CloneCell returns a new TextCell with the same value as this.TextCell and has
     * return type Cell.
     */
    test ("CloneCell Test", () => {
        expect(textCell.CloneCell(0, 0) instanceof Cell).toBe(true);
    })
});