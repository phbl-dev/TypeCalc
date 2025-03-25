import { beforeEach, describe, expect, test } from "vitest";
import { Cell } from "../src/back-end/Cells";
import { Sheet } from "../src/back-end/Sheet";
// import { Expr } from "../Expressions"; // This should be imported when it's done
import { SupportSet, Interval } from "../src/back-end/CellAddressing";
import { Value } from "../src/back-end/Value";
// import { Formats } from "../src/Types";
import { NumberValue } from "../src/back-end/NumberValue";
import { Workbook } from "../src/back-end/Workbook";

class TestCell extends Cell {
    constructor() {
        super();
    }

    AddToSupportSets(): void {}

    CloneCell(): Cell {
        return new TestCell();
    }

    DependsOn(): void {}

    EnqueueForEvaluation(): void {}

    Eval(): Value {
        return NumberValue.ZERO;
    }

    ForEachReferred(): void {}

    InsertRowCols(): void {}

    IsVolatile(): boolean {
        return false;
    }

    MarkDirty(): void {}

    MoveContents(): Cell {
        return new TestCell();
    }

    RemoveFromSupportSets(): void {}

    Reset(): void {}

    Show(): string {
        return "";
    }
}

describe("Cell - testing non-abstract methods", () => {
    let testCell: TestCell;
    let sheet: Sheet;
    let interval1: Interval,
        interval2: Interval,
        interval3: Interval,
        interval4: Interval;

    beforeEach(() => {
        testCell = new TestCell();
        sheet = new Sheet(new Workbook(),"testSheet",false);
        interval1 = new Interval(3, 3);
        interval2 = new Interval(4, 4);
        interval3 = new Interval(0, 2);
        interval4 = new Interval(0, 2);
    });
    test.skip("MarkCellDirty", () => {
    // Make test when get() is created in Sheet class
    });

    test.skip("EnqueueCellForEvaluation", () => {
    // Make test when get() is created in Sheet class
    });

    /**
    Check that showValue() returns a string.
   */
    test("showValue()", () => {
        expect(typeof testCell.showValue(sheet, 1, 2)).toBe("string");
    });

    test.skip("Parse", () => {
    // Make test when Parser class is done
    });

    /*
        AddSupport() adds a SupportSet to a cell when its current SupportSet is null
     */
    test("AddSupport()", () => {
        expect(testCell.GetSupportSet()).toBe(null);
        testCell.AddSupport(sheet, 1, 2, sheet, interval1, interval2);
        expect(testCell.GetSupportSet()).toBeInstanceOf(SupportSet);
    });

    /*
        If the supportSet of a cell only covers one cell and RemoveSupportFor() removes
        the support of that specific cell, then the length of the supportSet will be 0.
     */
    test("RemoveSupportFor() Test 1", () => {
        expect(testCell.GetSupportSet()?.ranges.length).toBe(undefined); // Initially, the SupportSet will be undefined. "?" safely accesses properties that could be null.
        testCell.AddSupport(sheet, 1, 2, sheet, interval1, interval2); // Then we add one support
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        testCell.RemoveSupportFor(sheet, 3, 4);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(0);
    });

    /*
        If a quadratic supportSet of a cell covers nine cells and RemoveSupportFor() removes
        the support of a corner cell, then the length of the supportSet will be 3. This is
        due to how the SupportArea splits up the supportSet into smaller sets because one of
        the cells was now removed.
     */
    test("RemoveSupportFor() Test 2", () => {
        expect(testCell.GetSupportSet()?.ranges.length).toBe(undefined); // Initially, the SupportSet will be undefined
        testCell.AddSupport(sheet, 3, 3, sheet, interval3, interval4); // Then we add one support
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        testCell.RemoveSupportFor(sheet, 0, 1);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(3);
    });

    /*
        If a quadratic supportSet of a cell covers nine cells and RemoveSupportFor() removes
        the support of the middle cell, then the length of the supportSet will be 4. This is
        because the minimum number of sets in the SupportArea must now be four.
     */
    test("RemoveSupportFor() Test 3", () => {
        expect(testCell.GetSupportSet()?.ranges.length).toBe(undefined); // Initially, the SupportSet will be undefined
        testCell.AddSupport(sheet, 3, 3, sheet, interval3, interval4); // Then we add one support
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        testCell.RemoveSupportFor(sheet, 1, 1);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(4);
    });

    /*
        This test checks the functionality of ForEachSupported(). We add a quadratic support area of 9 cells
        and start by checking that it has length 1. Then we call ForEachSupported() where the act method is
        RemoveSupportFor() such that we remove each y,z cell of the supportSet. Then, in the end, we check that
        the size of the supportSet is in fact 0.
     */
    test("ForEachSupported()", () => {
        testCell.AddSupport(sheet, 3, 3, sheet, interval3, interval4);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        testCell.ForEachSupported((x, y, z) =>
            testCell.RemoveSupportFor(sheet, y, z),
        );
        expect(testCell.GetSupportSet()?.ranges.length).toBe(0);
    });

    /*
        This test checks that TransferSupportTo() actually returns a new cell that contains the supportSet
        That we transferred from another cell. This goes for both newly added supportSets and supportSets
        that have just been reset.
     */
    test("TransferSupportTo", () => {
        testCell.AddSupport(sheet, 3, 3, sheet, interval3, interval4);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        expect(
            testCell.TransferSupportTo(new TestCell()).GetSupportSet()?.ranges.length,
        ).toBe(1);
        testCell.ResetSupportSet();
        expect(
            testCell.TransferSupportTo(new TestCell()).GetSupportSet()?.ranges.length,
        ).toBe(undefined);
    });

    /*
        This test checks that ResetSupportSet() actually resets the supportSet of a given cell.
     */
    test("ResetSupportSet", () => {
        testCell.AddSupport(sheet, 3, 3, sheet, interval3, interval4);
        expect(testCell.GetSupportSet()?.ranges.length).toBe(1);
        testCell.ResetSupportSet();
        expect(testCell.GetSupportSet()?.ranges.length).toBe(undefined);
    });
});
