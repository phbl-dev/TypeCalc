import { Workbook } from "../Workbook";
import { Cell, type Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
const workbook = new Workbook();
const sheet = new Sheet(workbook,"sheet1",true)
workbook.AddSheet(sheet)

/**
const A1:Cell = Cell.Parse('= 10 * 10',workbook, 0,0)!

sheet.SetCell(A1,0,0)

A1.MarkDirty()

A1.EnqueueForEvaluation(sheet,0,0)

A1.Eval(sheet,0,0)


//const A2:Cell = Cell.Parse('= 10 ',workbook, 0,0)!

const A3:Cell = Cell.Parse('=A1 * 100 ',workbook, 1,1)!


A3.MarkDirty()

A3.EnqueueForEvaluation(sheet,1,1)

A3.Eval(sheet,1,1)
*/

const A1:Cell = Cell.Parse('"QuoteCell"',workbook, 0,0)!



console.log(A1)
