import {describe, expect, test } from "vitest";
import { NumberCell, Cell } from "../src/back-end/Cells";
import { Sheet } from "../src/back-end/Sheet";
import { Workbook } from "../src/back-end/Workbook";
import { Value } from "../src/back-end/Value";
import { Formats } from "../src/back-end/Types";

describe ("NumberCell", () => {
    const numberCell: NumberCell = new NumberCell(10);
    const workbook: Workbook = new Workbook();
    const sheet: Sheet = new Sheet(workbook, "TestSheet", true);
    const fo: Formats = new Formats();

    /**
     * The constructor of NumberCell can take an integer.
     */
    test ("Constructor Test 1", () => {
        expect(new NumberCell(1) instanceof NumberCell).toBe(true);
    });

    /**
     * The constructor of NumberCell throws an error if the argument is infinite.
     */
    test.skip ("Constructor Test 2", () => {
        expect(() => new NumberCell(Infinity)).throws("Infinity is not a valid number");
    });

    /**
     * The constructor of NumberCell throws an error if the argument is NaN
     */
    test.skip ("Constructor Test 3", () => {
        expect(() => new NumberCell(NaN)).toThrowError("NaN is not a valid number");
    });

    /**
     * The constructor of NumberCell can take another NumberCell as argument
     */
    test ("Constructor Test 4", () => {
        expect(new NumberCell(numberCell) instanceof NumberCell).toBe(true);
    });

    /**
     * Eval returns the field value of type Value.
     */
    test ("Eval Test", () => {
        expect(numberCell.Eval(sheet, 0, 0) instanceof Value).toBe(true);
    })

    /**
     * Show returns the field value as a string.
     */
    test ("Show Test", () => {
        expect(typeof numberCell.Show(0, 0, fo)).toBe("string");
        expect(numberCell.Show(0, 0, fo)).toBe("10");
    })

    /**
     * CloneCell returns a new NumberCell with the same value as this.NumberCell and has
     * return type Cell.
     */
    test ("CloneCell Test", () => {
        expect(numberCell.CloneCell(0, 0) instanceof Cell).toBe(true);
        // console.log(typeof numberCell.CloneCell(0, 0)) // prints "object"
    })
});