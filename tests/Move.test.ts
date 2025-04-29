import { beforeEach, describe, expect, test } from "vitest";
import {Workbook} from "../src/back-end/Workbook";
import {Sheet} from "../src/back-end/Sheet";
import {CellArea, Expr, FunCall, NumberConst} from "../src/back-end/Expressions";
import {BlankCell, Formula, NumberCell} from "../src/back-end/Cells";


describe("Move", (): void => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "testSheet", false)
    })

    test("Move cell", (): void => {
        sheet.SetCell(new NumberCell(1),0,0)
        expect(sheet.Get(0,0).Eval(sheet,0,0).ToObject()).toBe(1)
        sheet.MoveCell(0,0,1,1)
        expect(sheet.Get(0,0)).toStrictEqual(new BlankCell())
        expect(sheet.Get(1,1).Eval(sheet,1,1).ToObject()).toBe(1)

        sheet.SetCell(new Formula(workbook, FunCall.Make("SUM", [new NumberConst(1), new NumberConst(2)])),2,2)
        workbook.Recalculate()
        expect(sheet.Get(2,2).Eval(sheet,2,2).ToObject()).toBe(3)
        sheet.MoveCell(2,2,3,3)
        workbook.Recalculate()
        expect(sheet.Get(2,2)).toStrictEqual(new BlankCell())
        expect(sheet.Get(3,3).Eval(sheet,3,3).ToObject()).toBe(3)
    })
})