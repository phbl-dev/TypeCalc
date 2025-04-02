import { Workbook } from "../Workbook";
import { ArrayFormula, Cell, Formula, NumberCell } from "../Cells";
import { Sheet } from "../Sheet";
import { CellArea, Expr, FunCall } from "../Expressions.ts";
import { Value } from "../Value.ts";
import { ArrayView } from "../ArrayValue.ts";
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

// Set up cells A1 and A2
const A1:Cell = Cell.Parse('10', workbook, 0, 0)!
sheet.SetCell(A1, 0, 0)
const A2:Cell = Cell.Parse('20', workbook, 0, 1)!
sheet.SetCell(A2, 0, 1)
workbook.Recalculate()

// Create and set A3 with the SUM formula
// Use coordinates (0,2) which is cell A3
const A3:Cell = Cell.Parse('= SUM(A1:A2)', workbook, 0, 2)!
sheet.SetCell(A3, 0, 2)

workbook.Recalculate()

// Assuming A3 is a Formula cell
if (A3 instanceof Formula) {
    const formula = A3 as Formula;
    console.log(formula.Expr); // In your class, you have a getter for e called Expr

    // Access the CellArea
    if (formula.Expr instanceof FunCall) {
        const funCall = formula.Expr as FunCall;
        console.log(funCall.es[0]); // This should be your CellArea

        // Check the CellArea evaluation
        const cellArea = funCall.es[0];
        if (cellArea instanceof CellArea) {
            const arrayView = cellArea.Eval(sheet, 0, 0);
            console.log(arrayView);

            // Check the individual values in the array
            if (arrayView instanceof ArrayView) {
                console.log("Rows:", arrayView.Rows);
                console.log("Cols:", arrayView.Cols);

                for (let r = 0; r < arrayView.Rows; r++) {
                    for (let c = 0; c < arrayView.Cols; c++) {
                        console.log(`Value at [${c},${r}]:`, arrayView.Get(c, r));
                    }
                }
            }
        }
    }
}

console.log(A3.Eval(sheet,0,0))