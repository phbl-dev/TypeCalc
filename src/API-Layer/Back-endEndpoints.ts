import {WorkbookManager} from "./WorkbookManager.ts";
import {Sheet} from "../back-end/Sheet.ts";
import {numberToLetters} from "../front-end/HelperFunctions.tsx";
import {ErrorValue} from "../back-end/Value.ts";
import {A1RefCellAddress, SupportCell} from "../back-end/CellAddressing.ts";
import {Cell, Formula} from "../back-end/Cells.ts";
import {Workbook} from "../back-end/Workbook.ts";

export function ParseToActiveCell(content: string): void {
    const a1Address: string | null = WorkbookManager.getActiveCell();
    if (!a1Address) {
        console.debug("[WorkbookIO] ParseToActiveCell cant find active cell");
        return;
    }
    const activeSheet: Sheet | null = WorkbookManager.getActiveSheet();
    if (!activeSheet) {
        console.debug("[WorkbookIO] ParseToActiveCell No activeSheet found!");
        return;
    }
    const ca: A1RefCellAddress = new A1RefCellAddress(a1Address);
    const cellCol: number = ca.col;
    const cellRow: number = ca.row;
    const cellToBeAdded: Cell | null = Cell.Parse(content, WorkbookManager.getWorkbook(), cellCol, cellRow);
    if (!cellToBeAdded) {
        console.debug("[WorkbookIO] ParseToActiveCell cellToBeAdded not found!");
        return;
    }
    WorkbookManager.getWorkbook().get(WorkbookManager.getActiveSheetName())?.SetCell(cellToBeAdded, cellCol, cellRow);
}

export function GetRawCellContent(cellID: string): string | null {
    const ca: A1RefCellAddress = new A1RefCellAddress(cellID);
    const cellCol: number = ca.col;
    const cellRow: number = ca.row;
    const wb: Workbook = WorkbookManager.getWorkbook();
    if (!wb) {
        console.debug("[GetRawCellContent] No workbook found!");
        return null;
    }
    const activeSheet: Sheet | null = WorkbookManager.getActiveSheet();
    if (!activeSheet) {
        console.debug("[GetRawCellContent] No activeSheet found!");
        return null;
    }


    const cell = activeSheet.getCells().Get(cellCol, cellRow);
    if (!cell) {
        console.debug("[GetRawCellContent] No cell found!");
        return null;
    }

    console.log("This is the cell", cell.GetText())
    // Special handling for Formula cells
    if (cell instanceof Formula) {
        console.log("This is a formula cell");
        let formulaText = cell.GetText()!;
        // Ensure it starts with equals sign
        if (!formulaText.startsWith("=")) {
            formulaText = "=" + formulaText;
        }
        return formulaText;
    }

    const cellContent: string | null | undefined = activeSheet.getCells().Get(cellCol, cellRow)?.GetText();
    //console.log("this is the cellContent", cellContent)
    if (!cellContent && cellContent != "0") {
        console.debug("[GetRawCellContent] No cell found!");
        return null;
    }
    const colChar: string = numberToLetters(cellCol);
    const cellHTML = document.getElementById(colChar + cellRow);
    if (!cellHTML) {
        console.debug("[GetRawCellContent] No cell found in frontend!");
        return null;
    }
    //cellHTML.innerText = cellContent;
    return cellContent
}

//This is the method for retrieving cell data for the current view-port in the front-end.
//Updates on every scroll, meaning that the values are stored only in back-end, and then repeatedly fetched
//Makes sure that we only load data in the viewport, everything else stays in back-end.
export function EvalCellsInViewport(activeSheet: string, leftCornerCol: number, rightCornerCol: number, topCornerRow: number, bottomCornerRow: number): void {
    const wb = WorkbookManager.getWorkbook();
    if (!wb) {
        console.debug("[ShowWindowInGUI] No workbook found!");
        return;
    }
    wb.Recalculate();

    const startCol: number = leftCornerCol;
    const endCol: number = rightCornerCol;
    const startRow: number = topCornerRow;
    const endRow: number = bottomCornerRow;
    const sheet: Sheet = wb.get(activeSheet) as Sheet; //This needs to be updated
    if (sheet) {
        for (let col: number = startCol; col <= endCol; col++) {
            for (let row: number = startRow; row <= endRow; row++) {
                const colChar: string = numberToLetters(col);
                const cellHTML = document.getElementById(colChar + row);
                if (cellHTML != null) {
                    const cell = sheet.Get(col - 1, row - 1);
                    if (cell != null) {
                        let cellEval = cell.Eval(sheet, 0, 0);
                        if (cellEval instanceof ErrorValue) {
                            cellHTML.innerText = cellEval.message;
                        } else if (cellEval != undefined) {
                            cellHTML.innerText = cellEval.ToObject() as string;
                        } else {
                            cellHTML.innerText = cell.GetText()!;
                        }
                    } else {
                        // Important: Clear the cell content when the cell is null
                        cellHTML.innerText = "";
                    }
                }
            }
        }
    }
}

export function GetSupportsInViewport(leftCornerCol: number, rightCornerCol: number, topCornerRow: number, bottomCornerRow: number, colIndex: number, rowIndex: number): string[] {
    let supports: string[] = []
    const startCol: number = leftCornerCol;
    const endCol: number = rightCornerCol;
    const startRow: number = topCornerRow;
    const endRow: number = bottomCornerRow;
    const sheet: Sheet = WorkbookManager.getActiveSheet() as Sheet; //This needs to be updated
    if (sheet) {
        for (let col: number = startCol; col <= endCol; col++) {
            for (let row: number = startRow; row <= endRow; row++) {
                let supportSet = sheet.getCells().Get(col, row)?.GetSupportSet()?.ranges;
                if (!supportSet) {
                    continue;
                }
                supportSet.forEach(function (value) {
                    if (value instanceof SupportCell) {
                        if (value.contains(sheet, colIndex - 1, rowIndex - 1)) {
                            const refLetter: string = numberToLetters(col + 1);
                            supports.push(refLetter + (row + 1) as string);
                        }
                    }
                })
            }
        }
    }
    return supports;
}