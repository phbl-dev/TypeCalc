import { Workbook } from "../Workbook";
import { Cell, type Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
const workbook = new Workbook();
const sheet = new Sheet(workbook,"sheet1",true)
workbook.AddSheet(sheet)


const A1:Cell = Cell.Parse('10',workbook, 0,0)!


sheet.SetCell(A1, 0,0)

console.log(A1)
