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

const A1:Cell = Cell.Parse('= 10 * 10',workbook, 0,0)!

sheet.SetCell(A1,1,1)

A1.MarkDirty()

A1.EnqueueForEvaluation(sheet,1,1)

A1.Eval(sheet,1,1)



const A4:Cell = Cell.Parse('= B2 - B2  ',workbook, 2,2)!




A4.MarkDirty()

A4.EnqueueForEvaluation(sheet,2,2)

A4.Eval(sheet,2,2)



/**
console.log(A1)
//console.log(A2)
console.log(A3)

console.log(A3.Show(0,0,workbook.format))
*/
console.log(A4)
