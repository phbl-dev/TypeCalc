import { describe, expect, test } from "vitest";
import { Cell, Formula, NumberCell, QuoteCell, TextCell } from "../src/back-end/Cells";
import { Workbook } from "../src/back-end/Workbook";
import { Sheet } from "../src/back-end/Sheet";
import { NumberConst, TextConst } from "../src/back-end/Expressions";



describe("Parse Numbers", () => {
    const workbook: Workbook = new Workbook();
    const sheet: Sheet = new Sheet(workbook, "sheet1", false)
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

    test("Parse Numbers: 10 + 10 ", () => {
        const cell: Cell = Cell.Parse("=10 + 10", workbook, 0, 0)!

        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(20)


    })

    test("Parse Numbers: 10 - 10 ", () => {
        const cell: Cell = Cell.Parse("=10 - 10", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(0)
    })

    test("Parse Numbers: 10 * 10 - 10 ", () => {
        const cell: Cell = Cell.Parse("=10 * 10 - 10", workbook, 0, 0)!
        cell.MarkDirty()

        cell.EnqueueForEvaluation(sheet, 0, 0)

        cell.Eval(sheet, 0, 0)

        expect(cell.Eval(sheet, 0, 0)!.ToObject()).toBe(90)
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
        const cell1:Cell = Cell.Parse("=10 * 10",workbook,0,0)!
        cell1.MarkDirty()

        cell1.EnqueueForEvaluation(sheet,0,0)

        cell1.Eval(sheet,0,0)

        sheet.SetCell(cell1,0,0)

        const cell2:Cell = Cell.Parse("=A1 - 10",workbook,0,0)!
        cell2.MarkDirty()

        cell2.EnqueueForEvaluation(sheet,0,0)

        cell2.Eval(sheet,0,0)

        expect(cell2.Eval(sheet,0,0)!.ToObject()).toBe(90)
    })


    test("Parse Cells: A1 = 10 * 10, B2 = A1 - 10", () => {
        const cell1:Cell = Cell.Parse("=10 * 10",workbook,0,0)!
        cell1.MarkDirty()

        cell1.EnqueueForEvaluation(sheet,0,0)

        cell1.Eval(sheet,0,0)

        sheet.SetCell(cell1,0,0)


        const cell2:Cell = Cell.Parse("=A1 - 10",workbook,0,0)!
        cell2.MarkDirty()

        cell2.EnqueueForEvaluation(sheet,0,0)

        cell2.Eval(sheet,0,0)

        sheet.SetCell(cell2,1,1)

        const cell3:Cell = Cell.Parse("=A1 * B2",workbook,0,0)!
        cell3.MarkDirty()

        cell3.EnqueueForEvaluation(sheet,0,0)

        cell3.Eval(sheet,0,0)


        expect(cell2.Eval(sheet,1,1)!.ToObject()).toBe(90)

    })





})

describe("Parse Strings", () => {
    const workbook: Workbook = new Workbook();
    const sheet: Sheet = new Sheet(workbook, "sheet1", false)
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
})