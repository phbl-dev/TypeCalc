import { Workbook } from "../Workbook";
import { Cell, Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
const workbook = new Workbook();
const sheet = new Sheet(workbook,"sheet1",true)
workbook.AddSheet(sheet)

const A1:Cell = Cell.Parse("= SUM(10,10)", workbook, 0, 0)! // A1

sheet.SetCell(A1, 0,0)

A1.MarkDirty()

A1.EnqueueForEvaluation(sheet,0,0)


const A2:Cell = Cell.Parse("= SUM(10,10)",workbook, 0, 1)!


// 0 = Dirty, 1 = Enqueued, 2 = Computing, 3 = Uptodate

console.log("Before evaluation - A1 state:", (A1 as Formula).state);
A1.Eval(sheet, 0, 0);
console.log("After evaluation - A1 state:", (A1 as Formula).state);

A2.MarkDirty()
A2.EnqueueForEvaluation(sheet,0,1)




console.log("Before evaluation - A1 state:", (A2 as Formula).state);
A2.Eval(sheet, 0, 1);
console.log("After evaluation - A1 state:", (A2 as Formula).state);



sheet.SetCell(A2, 0,1)

const B2:Cell = Cell.Parse('= (10 * 10) * 10' ,workbook, 1, 1)!

B2.MarkDirty()

B2.EnqueueForEvaluation(sheet,1,1)

B2.Eval(sheet, 1, 1);

sheet.SetCell(B2, 1,1)




console.log("A1 Formula:", A1.Show(0, 0, workbook.format));
console.log("A2 Formula:", A2.Show(0, 1, workbook.format));
console.log("B2 Formula:", B2.Show(0, 0, workbook.format));

console.log(sheet.Get(1,1))