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
        cellArea = new CellArea(sheet, false, 0, false, 0, false, 2, false, 2); // Creating a cell area from A1:C3 with relative references.
        funCall = FunCall.Make("FREQUENCY", [cellArea, ExprArray.MakeExprArray([new NumberConst(2), new NumberConst(4)])])                         // Creating a function call to FREQUENCY
        formula = Formula.Make(workbook, funCall)                               // Creating a Formula Cell containing the function call
        sheet.SetCell(formula, 3, 0)

    })

    test("constructor and eval", () => {
        // Creating a cached array formula stored in A4 and holding a reference to the cell area A1:C3:
        let cachedArrayFormula = new CachedArrayFormula(formula, sheet, 3, 0, new SuperCellAddress(0,0), new SuperCellAddress(2,2));
        workbook.Recalculate()

        const result = cachedArrayFormula.Eval();
        console.log("Result:", result);
    })


})