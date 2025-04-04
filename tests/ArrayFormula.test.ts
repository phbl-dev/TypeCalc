import { beforeEach, describe, expect, test } from "vitest";
import {ArrayFormula, CachedArrayFormula, Formula} from "../src/back-end/Cells";
import {Workbook} from "../src/back-end/Workbook";
import {CellArea, Expr, FunCall} from "../src/back-end/Expressions";
import {Sheet} from "../src/back-end/Sheet";
import {SuperCellAddress} from "../src/back-end/CellAddressing";

describe("ArrayFormula", () => {
    let workbook: Workbook;
    let sheet: Sheet;
    let cellArea: CellArea;
    let funCall: Expr;
    let formula: Formula;
    let cachedArrayFormula: CachedArrayFormula;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "testSheet", false)
        cellArea = new CellArea(sheet, false, 0, false, 0, false, 2, false, 2); // Creating a cell area from A1:C3 with relative references.
        funCall = FunCall.Make("FREQUENCY", [cellArea])                         // Creating a function call to FREQUENCY
        formula = Formula.Make(workbook, funCall)                               // Creating a Formula Cell containing the function call

        // Creating a cached array formula stored in A4 and holding a reference to the cell area A1:C3:
        cachedArrayFormula = new CachedArrayFormula(formula, sheet, 3, 0, new SuperCellAddress(0,0), new SuperCellAddress(2,2));
    })

    test("constructor 1", () => {

    })

    test("constructor 2", () => {

    })

    test("constructor 3", () => {

    })

    test("Eval", () => {

    })

    test("Contains", () => {

    })

    test("MoveContents", () => {

    })

    test("Eval", () => {

    })

    test("InsertRowCols", () => {

    })

    test("ShowValue", () => {

    })

    test("MarkDirty", () => {

    })

    test("EnqueueForEvaluation", () => {

    })

    test("Reset", () => {

    })

    test("ResetSupportSet", () => {

    })

    test("AddToSupportSets", () => {

    })

    test("RemoveFromSupportSets", () => {

    })

    test("ForEachReferred", () => {

    })

    test("CloneCell", () => {

    })

    test("IsVolatile", () => {

    })

    test("DependsOn", () => {

    })

    test("Show", () => {

    })
})