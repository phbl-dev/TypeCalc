import { beforeEach, describe, expect, test } from "vitest";
import {ArrayFormula, CachedArrayFormula, CellState, Formula, NumberCell} from "../src/back-end/Cells";
import {Workbook} from "../src/back-end/Workbook";
import {CellArea, Expr, ExprArray, FunCall, NumberConst} from "../src/back-end/Expressions";
import {Sheet} from "../src/back-end/Sheet";
import {SuperCellAddress} from "../src/back-end/CellAddressing";

describe("ArrayFormula", () => {
    let workbook: Workbook;
    let sheet: Sheet;
    let cellArea: CellArea;
    let funCall: Expr;
    let formula: Formula;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "testSheet", false)
        let val = 1;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                sheet.SetCell(new NumberCell(val++), i, j)
            }
        }

        // forstår ikke hvorfor det kun virker når referencen er absoloute og ikke relative
        cellArea = new CellArea(sheet, true, 0, true, 0, true, 2, true, 2); // Creating a cell area from A1:C3 with relative references.
        funCall = FunCall.Make("FREQUENCY", [cellArea, ExprArray.MakeExprArray([new NumberConst(2), new NumberConst(4)])])                         // Creating a function call to FREQUENCY
        formula = Formula.Make(workbook, funCall)                               // Creating a Formula Cell containing the function call
        sheet.SetCell(formula, 0, 3)
        workbook.Recalculate()


    })

    test("constructor and eval", () => {
        // Creating a cached array formula stored in A4 and holding a reference to the cell area A1:C3:
        // Creating a cached array formula:
        let cachedArrayFormula = new CachedArrayFormula(
            formula,            // Your FREQUENCY formula
            sheet,              // The sheet
            0, 3,               // Formula position (col=0, row=3) - A4
            new SuperCellAddress(0, 3),  // Output range start (A4)
            new SuperCellAddress(0, 5)   // Output range end (A6)
        );

        // Place ArrayFormula cells in the output range
        // Place ArrayFormula cells in the output range
        // Create array formulas with the EXACT structure that matches your array
        const arrayFormula1 = new ArrayFormula(cachedArrayFormula, 0, 0); // First element
        const arrayFormula2 = new ArrayFormula(cachedArrayFormula, 0, 1); // Second element
        const arrayFormula3 = new ArrayFormula(cachedArrayFormula, 0, 2); // Third element

        // Place these cells at their sheet positions
        sheet.SetCell(arrayFormula1, 0, 3);
        sheet.SetCell(arrayFormula2, 0, 4);
        sheet.SetCell(arrayFormula3, 0, 5);

        workbook.Recalculate();

        expect(sheet.Get(0, 3).Eval(sheet, 0, 0).ToObject()).toBe(2);
        expect(sheet.Get(0, 4).Eval(sheet, 0, 0).ToObject()).toBe(2);
        expect(sheet.Get(0, 5).Eval(sheet, 0, 0).ToObject()).toBe(5);
    })
})