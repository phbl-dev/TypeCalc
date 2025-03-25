import { describe, expect, test, vi } from "vitest";
import { Interval, SupportArea, SupportSet } from "../back-end/CellAddressing";
import { Sheet } from "../back-end/Sheet";
import {Workbook} from "../back-end/Workbook";

describe("Support Set tests", () => {
    const testSheet: Sheet = new Sheet(new Workbook(),"testSheet",false);
    const mainCellCol = 0;
    const mainCellRow = 1;

    test("Add a single support cell, then delete it", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 2);
        const rowInterval: Interval = new Interval(2, 2);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        expect(testSupportSet.ranges.length).toBe(1);
        testSupportSet.removeCell(testSheet, 2, 2);
        expect(testSupportSet.ranges.length).toBe(0);
    });

    test("Add 3x3 support area, then delete 1 corner cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 4);
        const rowInterval: Interval = new Interval(2, 4);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        expect(testSupportSet.ranges.length).toBe(1);
        testSupportSet.removeCell(testSheet, 2, 2);
        expect(testSupportSet.ranges.length).toBe(2);
    });

    test("Add 3x3 support area, then delete 1 outer middle cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 4);
        const rowInterval: Interval = new Interval(2, 4);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        expect(testSupportSet.ranges.length).toBe(1);
        testSupportSet.removeCell(testSheet, 2, 3);
        expect(testSupportSet.ranges.length).toBe(3);
    });

    test("Add 3x3 support area, then delete the middle cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 4);
        const rowInterval: Interval = new Interval(2, 4);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        expect(testSupportSet.ranges.length).toBe(1);
        testSupportSet.removeCell(testSheet, 3, 3);
        expect(testSupportSet.ranges.length).toBe(4);
    });

    test("Add 4x4 support area, then perform some action for every cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 5);
        const rowInterval: Interval = new Interval(2, 5);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(1);
        expect(testAction).toHaveBeenCalledTimes(16);
    });

    test("Add 4x4 support area, then delete one middle cell, then perform some action for every cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(2, 5);
        const rowInterval: Interval = new Interval(2, 5);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        testSupportSet.removeCell(testSheet, 3, 3);
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(4);
        expect(testAction).toHaveBeenCalledTimes(15);
    });

    test("Add 4x4 support area that includes original cell then perform some action for every cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(0, 3);
        const rowInterval: Interval = new Interval(0, 3);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(3);
        expect(testAction).toHaveBeenCalledTimes(15);
    });

    test("Add 3x3 support area, then add an overlapping 3x3 area, then perform some action for all", () => {
        const testSupportSet = new SupportSet();
        SupportArea.idempotentForeachFunction = true;
        const colInterval: Interval = new Interval(2, 4);
        const rowInterval: Interval = new Interval(2, 4);
        const secColInterval: Interval = new Interval(3, 5);
        const secRowInterval: Interval = new Interval(3, 5);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            secColInterval,
            secRowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(2);
        //3*3 grid * 2 = 18 cells, with 4 overlapping each other = 14.
        expect(testAction).toHaveBeenCalledTimes(14);
    });

    test("Add 3x3 support area that overlaps original cell, then add an overlapping 3x3 area, then perform some action for all", () => {
        const testSupportSet = new SupportSet();
        SupportArea.idempotentForeachFunction = true;
        const colInterval: Interval = new Interval(0, 2);
        const rowInterval: Interval = new Interval(0, 2);
        const secColInterval: Interval = new Interval(1, 3);
        const secRowInterval: Interval = new Interval(1, 3);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            secColInterval,
            secRowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(4);
        //3*3 grid * 2 = 18 cells, with 4 overlapping each other, and 1 less for the original cell = 13.
        expect(testAction).toHaveBeenCalledTimes(13);
    });

    test("Add 1000x1000 Support Area that overlaps main cell, then perform some action for all", () => {
        const testSupportSet = new SupportSet();
        SupportArea.idempotentForeachFunction = true;
        const colInterval: Interval = new Interval(0, 999);
        const rowInterval: Interval = new Interval(0, 999);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(3);
        //3*3 grid * 2 = 18 cells, with 4 overlapping each other, and 1 less for the original cell = 13.
        expect(testAction).toHaveBeenCalledTimes(999999);
    });

    test("Add 1 support cell that overlaps main cell", () => {
        const testSupportSet = new SupportSet();
        const colInterval: Interval = new Interval(0, 0);
        const rowInterval: Interval = new Interval(1, 1);
        testSupportSet.addSupport(
            testSheet,
            mainCellCol,
            mainCellRow,
            testSheet,
            colInterval,
            rowInterval,
        );
        const testAction = vi.fn();
        testSupportSet.forEachSupported(testAction);

        expect(testSupportSet.ranges.length).toBe(0);
        expect(testAction).toHaveBeenCalledTimes(0);
    });
});
