import { SpreadsheetVisitor } from "./Visitor";
import { Workbook } from "../Workbook";
import { FunCall, NumberConst } from "../Expressions";
import { NumberValue } from "../NumberValue";
import { Formula } from "../Cells";
import { Sheet } from "../Sheet";

const f = new SpreadsheetVisitor().ParseCell("= 10 + 10)", new Workbook(), 1, 1);

const sheet = new Sheet(new Workbook(), "sheet", false);
if (f != null) {
    sheet.SetCell(f, 1, 1);
}

console.log(sheet.getCells());

f!.MarkDirty();

f!.EnqueueForEvaluation(sheet, 1, 1);

console.log(JSON.stringify(f!.Eval(sheet, 1, 1)));


const d = new SpreadsheetVisitor().ParseCell("= A1", new Workbook(), 1, 2);

sheet.SetCell(d!, 1, 2);

d!.MarkDirty();

d!.EnqueueForEvaluation(sheet, 1, 2);

console.log(JSON.stringify(d!.Eval(sheet, 1, 2)));

