import { beforeEach, describe, expect, test } from "vitest";
import {ArrayFormula, Cell, Formula, NumberCell, QuoteCell, TextCell} from "../src/back-end/Cells";
import { Workbook } from "../src/back-end/Workbook";
import { Sheet } from "../src/back-end/Sheet";
import {CellArea, NumberConst, TextConst} from "../src/back-end/Expressions";



describe("Parse Numbers", () => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "sheet1", false)
    })

    test("Parse Numbers: 10", () => {
        const cell: Cell = Cell.Parse("=10", workbook, 0, 0)!

        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(10)


    })

    test("Parse Numbers: 10 * 10 ", () => {
        const cell: Cell = Cell.Parse("=10 * 10", workbook, 0, 0)!

        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(100)


    })

    test("Parse Numbers: 10 + 10 + 10 ", () => {
        const cell: Cell = Cell.Parse("= 10 + 10 + 10", workbook, 0, 0)!

        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(30)


    })

    test("Parse Numbers: 10 + 10 + 10 - 10 - 10 - 10", () => {
        const cell: Cell = Cell.Parse("=10 + 10 + 10 - 10 +  10 * 10", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(120)
    })

    test("Parse Numbers: 10 - 10 ", () => {
        const cell: Cell = Cell.Parse("= 10 - 10", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(0)
    })

    test("Parse Numbers: SUM(10,10,10) ", () => {
        const cell: Cell = Cell.Parse("=SUM(10, 10, 10)", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(30)
    })

    test("Parse Numbers: 10 - 10 - 10 ", () => {
        const cell: Cell = Cell.Parse(`= 10 - 10 - 10`, workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(-10)
    })

    test("Parse Numbers: 10 * 10 - 10 * 5", () => {
        const cell: Cell = Cell.Parse("=10 * 10 - 10 * 5", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(50)
    })
})
describe("Parse Cells", () => {
    const workbook: Workbook = new Workbook();
    const sheet: Sheet = new Sheet(workbook, "sheet1", false)
    test("Parse Cells: A1 = 10 * 10, B2 = A1 - 10", () => {
        const cell1:Cell = Cell.Parse("= 10 * 10 * 10 ",workbook,0,0)!
        cell1.MarkDirty()

        cell1.EnqueueForEvaluation(sheet,0,0)

        cell1.Eval(sheet,0,0)

        sheet.SetCell(cell1,0,0)

        const cell2:Cell = Cell.Parse("=A1/10 - 10",workbook,0,0)!
        cell2.MarkDirty()

        cell2.EnqueueForEvaluation(sheet,0,0)

        console.log(cell2.Eval(sheet,0,0))

        expect(cell2.Eval(sheet,0,0)!.ToObject()).toBe(90)
    })


    test("Parse Cells: A1 = 10 * 10, B2 = A1 - 10, C3 = A1 * B2", () => {
        const A1:Cell = Cell.Parse("=10 * 10",workbook,0,0)!
        A1.MarkDirty()

        A1.EnqueueForEvaluation(sheet,0,0)

        A1.Eval(sheet,0,0)

        sheet.SetCell(A1,0,0)


        const B2:Cell = Cell.Parse("=A1 - 10",workbook,0,0)!
        B2.MarkDirty()

        B2.EnqueueForEvaluation(sheet,0,0)

        B2.Eval(sheet,0,0)

        sheet.SetCell(B2,1,1)

        const C3:Cell = Cell.Parse("=A1 * B2",workbook,0,0)!
        C3.MarkDirty()

        C3.EnqueueForEvaluation(sheet,0,0)


        console.log(C3.Eval(sheet,0,0))

        expect(C3.Eval(sheet,0,0)!.ToObject()).toBe(9000)

    })





})

describe("Parse Strings", () => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "sheet1", false)
    })
    test("Parse Strings: Hr Hildegaard", () => {
        const cell:TextConst = Cell.Parse('"Hr Hildegaard"', workbook, 0, 0) as unknown as TextConst

        expect(cell.value.value).toBe("Hr Hildegaard")

    })

    test("Parse quotecell", () => {
        const cell:QuoteCell = Cell.Parse("'Hildegaard'",workbook,0,0) as QuoteCell
        expect(cell.value.value).toBe("Hildegaard")

    })

    test("Parse number", () => {
        const cell:NumberCell = Cell.Parse("10",workbook,0,0) as NumberCell
    })

    test("Parse date", () => {
        const cell = Cell.Parse("2004-12-10[T12:10:10[.200123123]]",workbook,0,0) as NumberCell

        console.log(cell.value.value)

    })

    test("Parse SUM a CellArea", () => {
        const A2 = Cell.Parse("1", workbook,0,0)
        const A3 = Cell.Parse("2", workbook,0,0)
        const A1 = Cell.Parse("=SUM(A2:A4)", workbook,0,0)

        sheet.SetCell(A1,0,0)
        sheet.SetCell(A2,0,1)
        sheet.SetCell(A3,0,2)

        workbook.Recalculate()
        console.log("result: " + sheet.Get(0,0).Eval(sheet,0,0).ToObject()) // should print 3
    })

    test("Parse SUM a CellArea", () => {
        const B2 = Cell.Parse("1", workbook,0,0)
        const B3 = Cell.Parse("2", workbook,0,0)
        const B1 = Cell.Parse("=SUM(B2:B4)", workbook,0,0)

        sheet.SetCell(B1,1,0)
        sheet.SetCell(B2,1,1)
        sheet.SetCell(B3,1,2)

        workbook.Recalculate()
        expect(sheet.Get(1,0).Eval(sheet,0,0).ToObject()).toBe(3)
    })

    test("Parse SUM a CellArea", () => {
        const A2 = Cell.Parse("2", workbook,0,0)
        const A3 = Cell.Parse("2", workbook,0,0)

        const B2 = Cell.Parse("2", workbook,0,0)
        const C3 = Cell.Parse("2", workbook,0,0)


        const A1 = Cell.Parse("=SUM(A2:C4)", workbook,0,0)

        sheet.SetCell(A1,0,0)
        sheet.SetCell(A2,0,1)
        sheet.SetCell(A3,0,2)
        sheet.SetCell(B2,1,1)
        sheet.SetCell(C3,2,2)

        workbook.Recalculate()
        expect(sheet.Get(0,0).Eval(sheet,0,0).ToObject()).toBe(8)
    })
})