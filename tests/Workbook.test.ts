import { beforeEach, describe, expect, test } from "vitest";
import { Workbook } from "../src/Workbook";
import { Sheet, SheetRep } from "../src/Sheet";
import { NumberCell, TextCell } from "../src/Cells";
import { NumberValue } from "../src/NumberValue";
import { FullCellAddress, Interval, SuperCellAddress, SuperRARef } from "../src/CellAddressing";
import { TextValue } from "../src/TextValue";


describe("Workbook", () => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", 0, 0, false);
    });

    /**
     * AddSheet correctly adds one sheet to the 'sheets' array.
     */
    test("AddSheet", () => {
        expect(workbook.GetSheets().length).toBe(0); // The sheets array should have length 0 initially
        workbook.AddSheet(sheet);                    // Add one sheet to the array

        expect(workbook.GetSheets().length).toBe(1); // After adding one sheet it should have length 1
        expect(workbook.GetSheets()[0]).toBe(sheet); // Ensures the correct sheet was added
    });

    /**
     * RecordCellChange correctly records a cell change in the 'editedCells' array.
     */
    test("RecordCellChange",  () => {
        expect(workbook.GetEditedCells().length).toBe(0); // The editedCells array should have length 0 initially
        workbook.RecordCellChange(0, 0, sheet);           // Record a cell change in a sheet a position 0,0.
        expect(workbook.GetEditedCells().length).toBe(1); // After calling RecordCellChange once the editedCells should have length 1.
        expect(workbook.GetEditedCells()[0].cellAddress).toBe(sheet.workbook.GetEditedCells()[0].cellAddress); // Ensure that the edit occurred in the intended position of the sheet.
    });

    /**
     * Test that get() returns a sheet from 'sheets'.
     */
    test("get",  () => {
        workbook.AddSheet(sheet);                                       // Add one sheet to the array
        expect(workbook.get(0)).not.toBeNull();                         // Ensures it's not null
        expect(workbook.get(0)!.getName()).toBe("TestSheet");           // Test that get() is able to return the sheet when the argument is a number. Since we just checked that workbook.get(0) was not null it is safe to use ! (the non-null assertion operator).

        expect(workbook.get("TestSheet")).not.toBeNull();               // Ensure it's not null when getting the sheet by its name
        expect(workbook.get("TestSheet")!.getName()).toBe("TestSheet"); // Test that get() is able to return the sheet when the argument is a string
    });

    /**
     * Recalculate update cell values of the workbook.
     * (Should be tested with Formula cell).
     */
    test.skip("Recalculate",  () => {
        const recalceResult = workbook.Recalculate();
        expect(typeof recalceResult).toBe("number"); // Recalculate() returns a number.
        expect(recalceResult).toBeGreaterThan(0);    // Expect the time to be valid, i.e. positive.

        const cellAddress: SuperCellAddress = new SuperCellAddress(0, 0);
        sheet.Set(cellAddress, new NumberCell(10));

        const cellAddress2: SuperCellAddress = new SuperCellAddress(1, 0);
        sheet.Set(cellAddress2, new TextCell("Test Text"));

        const cellA = sheet.getCells().Get(0, 0);    // Get the newly added cells and store them in variables
        const cellB = sheet.getCells().Get(1, 0);

        expect(cellA).not.toBeNull();                         // Ensure they are not null
        expect(cellB).not.toBeNull();

        expect(cellA!.Eval(sheet, 0, 0)).toEqual(NumberValue.Make(10)); // The content of 0,0 should be 10
        expect(cellB!.Eval(sheet, 1, 0)).toEqual(TextValue.Make("Test Text")); // The content of 1,0 should be "Test Text"

        expect(workbook.GetEditedCells().length).toBe(2);     // Sheet.Set() calls Workbook.RecordCellChange() so editedCells should have length 2.

        workbook.Recalculate();                               // Run Recalculate()

        expect(workbook.GetEditedCells().length).toBe(0);     // After calling Recalculate() once the editedCells should have length 0 because they were marked dirty, enqueued for evaluation and then reevaluated.

        // In this case the reevaluation won't have caused any change to the cell values because these two are just static cells with no dynamic values:
        expect(cellA!.Eval(sheet, 0, 0)).toEqual(NumberValue.Make(10)); // Ensuring that the cell content is still the same after recalculation
        expect(cellB!.Eval(sheet, 1, 0)).toEqual(TextValue.Make("Test Text")); // Ensuring that the cell content is still the same after recalculation

        // Redo the test when FunCall and FormulaJS is implemented to see if values of a cell with a function that holds cell references is updated if the one of the cell references change value.
    });


    test("AddToQueue", () => {
        expect(workbook.GetAwaitsEvaluation().length).toBe(0);                     // Initially, the length of the 'awaitsEvaluation' is 0
        workbook.AddToQueue(sheet, 0, 0);                                          // Adding one cell to the queue
        expect(workbook.GetAwaitsEvaluation().length).toBe(1);                     // Now, the length of the 'awaitsEvaluation' is 1
        expect(workbook.GetAwaitsEvaluation()[0].toString()).toBe("TestSheet!A1"); // And the cell is in fact in position A1 (corresponding to 0,0) and from sheet "TestSheet"

        workbook.AddToQueue(sheet, 1, 0);                                          // Now we add a new cell to the array, and it should hold the FIFO order as in a queue
        expect(workbook.GetAwaitsEvaluation().length).toBe(2);                     // Now, the length of the 'awaitsEvaluation' is 2
        expect(workbook.GetAwaitsEvaluation()[0].toString()).toBe("TestSheet!A1"); // The old cell is still at index 0 as it should be
        expect(workbook.GetAwaitsEvaluation()[1].toString()).toBe("TestSheet!B1"); // And the newly added cell is at index 1 as expected.
    });


    test("ResetCellState", () => {
        // Make test when Formula, ArrayFormula and Cached ArrayFormula is created
    });

    test.skip("RebuildSupportGraph", () => {
        expect(workbook.GetSheets().length).toBe(0);                        // The sheets array should have length 0 initially
        workbook.AddSheet(sheet);
        let numbercellA1 = new NumberCell(5);                    // Creating numbercellA1 of value 5
        sheet.SetCell(numbercellA1, 0, 0);                                  // Setting numbercellA1 at position 0,0
        expect(sheet.Get(0,0)).toBeDefined();                               // Ensures that cell at position 0,0 is neither null or undefined.

        let numbercellB2 = new NumberCell(10);                   // Creating numbercellB2 of value 10
        sheet.SetCell(numbercellB2, 1, 1);                                  // Setting numbercellB2 at position 1,1
        expect(sheet.Get(1,1)).toBeDefined();                               // Ensures that cell at position 1,1 is neither null or undefined.

        sheet.AddSupport(0,0, sheet, new Interval(1,1), new Interval(1,1))  // Adding support to the intervals that corresponds to the cell at position 1,1

        console.log("Getting support set from A1:");
        console.log(sheet.Get(0,0)!.GetSupportSet());
        console.log();
        console.log("Getting support set from B2: ");
        console.log(sheet.Get(1,1)!.GetSupportSet());

        workbook.RebuildSupportGraph(); // Doesn't work because Reset is not implemented on a NumberCell.
        // It seems like only Formula/ArrayFormula/CachedArrayFormula cells should support other cells
        // so the test should be finished when these classes are implemented.

        console.log("Getting support set from A1:");
        console.log(sheet.Get(0,0)!.GetSupportSet());
        console.log();
        console.log("Getting support set from B2: ");
        console.log(sheet.Get(1,1)!.GetSupportSet());
    });

    test("ResetVolatileSet", () => {
        // Probably makes more sense to test this method when Formula is implemented to detect a change in a volatile cell cause by a formula cell.
    });

    test.skip("IncreaseVolatileSet", () => {
        expect(workbook.GetVolatileCells().size).toBe(0);
        const cell = new TextCell("Test Text");
        sheet.SetCell(cell, 0,0)
        workbook.IncreaseVolatileSet(cell, sheet, 0,0);   // Should it maybe be made impossible to add a non-volatile cell to the set?
        expect(workbook.GetVolatileCells().size).toBe(1); // Doesn't work because the cell is not marked as Volatile which it can't because it's not a Formula or ArrayFormula

        // FINISH THIS TEST when Formula/ArrayFormula is done.
    });

    test("DecreaseVolatileSet", () => {
        // FINISH THIS TEST when Formula/ArrayFormula is done.
    });

    test("SheetCount", () => {
        expect(workbook.SheetCount()).toBe(0);
        workbook.AddSheet(sheet);
        expect(workbook.SheetCount()).toBe(1);
        workbook.Clear("sheets");
        expect(workbook.SheetCount()).toBe(0);
    });

    test("Is the workbook iterable?", () => {
        const sheet2 = new Sheet(workbook, "Sheet2", 0, 0, false);        // Create an extra sheet

        workbook.AddSheet(sheet);                                         // Add the sheets to the workbook
        workbook.AddSheet(sheet2);

        const iterator = workbook[Symbol.iterator](); // Get the iterator manually

        expect(iterator.next().value).toBe(sheet);                        // Check the first value
        expect(iterator.next().value).toBe(sheet2);                       // Check the second value
        expect(iterator.next().done).toBe(true);                          // Check that the iterator is now done
    });

    test("Clear", () => {
        expect(workbook.SheetCount()).toBe(0);
        expect(workbook.GetEditedCells().length).toBe(0);
        expect(workbook.GetVolatileCells().size).toBe(0);
        expect(workbook.GetAwaitsEvaluation().length).toBe(0);

        workbook.AddSheet(sheet);
        workbook.RecordCellChange(0,0,sheet);
        // workbook.IncreaseVolatileSet() // Implement when we can make a volatile cell
        workbook.AddToQueue(sheet, 0,0);

        expect(workbook.SheetCount()).toBe(1);
        expect(workbook.GetEditedCells().length).toBe(1);
        //expect(workbook.GetVolatileCells().size).toBe(1);
        expect(workbook.GetAwaitsEvaluation().length).toBe(1);


        workbook.Clear("sheets");
        workbook.Clear("editedCells");
        workbook.Clear("volatileCells");
        workbook.Clear("awaitsEvaluation");

        expect(workbook.SheetCount()).toBe(0);
        expect(workbook.GetEditedCells().length).toBe(0);
        expect(workbook.GetVolatileCells().size).toBe(0);
        expect(workbook.GetAwaitsEvaluation().length).toBe(0);

    });
});