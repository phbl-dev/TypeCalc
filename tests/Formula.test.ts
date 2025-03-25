import { beforeEach, describe, expect, test } from "vitest";

import { Cell, Formula, NumberCell } from "../back-end/Cells";
import { Workbook } from "../back-end/Workbook";
import { Expr, FunCall, NumberConst } from "../back-end/Expressions";
import { Sheet } from "../back-end/Sheet";
import { NumberValue } from "../back-end/NumberValue";

describe("Formula", () => {
    let workbook: Workbook;
    let sheet: Sheet;
    let expr1: Expr;
    let expr2: Expr;
    let expr3: Expr;



    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "test", true)
        expr1 = new NumberConst(1);
        expr2 = new NumberConst(1);
        expr3 = FunCall.Make("SUM", [expr1, expr2]);

    });

    test("Eval", () => {
        const formula: Formula | null = Formula.Make(workbook, expr3)
        if (formula !== null) {
            sheet.SetCell(formula, 0, 0);
            formula.MarkDirty();
            formula.EnqueueForEvaluation(sheet, 0, 0)
            console.log("Eval: " + NumberValue.ToNumber(formula.Eval(sheet, 0, 0)));
        } else {
            console.log("formula is null")
        }
    })
})