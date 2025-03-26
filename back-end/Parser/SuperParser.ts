import { Workbook } from "../Workbook";
import { Cell, Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
const workbook = new Workbook();
const sheet = new Sheet(workbook,"sheet1",true)
workbook.AddSheet(sheet)

const A1:Cell = Cell.Parse("= SUM(10,10)", workbook, 1, 0)!

sheet.SetCell(A1, 1,0)

A1.MarkDirty()

A1.EnqueueForEvaluation(sheet,1,0)


const A2:Cell = Cell.Parse("= (A1 * 3)",workbook, 1, 1)!


// 0 = Dirty, 1 = Enqueued, 2 = Computing, 3 = Uptodate

console.log("Before evaluation - A1 state:", (A1 as Formula).state);
A1.Eval(sheet, 1, 0);
console.log("After evaluation - A1 state:", (A1 as Formula).state);

A2.MarkDirty()
A2.EnqueueForEvaluation(sheet,1,1)




console.log("Before evaluation - A1 state:", (A2 as Formula).state);
A2.Eval(sheet, 1, 1);
console.log("After evaluation - A1 state:", (A2 as Formula).state);



sheet.SetCell(A2, 1,1)

console.log(sheet.Get(1,1))


console.log("A1 Formula:", A1.Show(0, 0, workbook.format));
console.log("A2 Formula:", A2.Show(1, 1, workbook.format));
