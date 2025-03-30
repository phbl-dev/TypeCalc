import { Workbook } from "../Workbook";
import { Cell, type Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
const workbook = new Workbook();
const sheet = new Sheet(workbook,"sheet1",true)
workbook.AddSheet(sheet)



const B2:Cell = Cell.Parse('= - 10' ,workbook, 1, 1)!

B2.MarkDirty()

B2.EnqueueForEvaluation(sheet,1,1)

B2.Eval(sheet, 1, 1);

sheet.SetCell(B2, 1,1)

console.log(B2)