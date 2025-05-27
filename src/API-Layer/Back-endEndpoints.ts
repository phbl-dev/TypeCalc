import {WorkbookManager} from "./WorkbookManager.ts";
import {Sheet} from "../back-end/Sheet.ts";
import {numberToLetters} from "../front-end/HelperFunctions.tsx";
import {ArrayExplicit, ErrorValue} from "../back-end/Values.ts";
import {A1RefCellAddress, FullCellAddress, SuperCellAddress} from "../back-end/CellAddressing.ts";
import {ArrayFormula, Cell, Formula} from "../back-end/Cells.ts";
import {Workbook} from "../back-end/Workbook.ts";

/**
 * Parse the content of the active cell and add it to the workbook.
 * Creates a new cell if the active cell is empty, otherwise updates the existing cell.
 * @param content
 * @constructor
 */

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
    WorkbookManager.getWorkbook().getSheet(WorkbookManager.getActiveSheetName())?.SetCell(cellToBeAdded, cellCol, cellRow);
}

/**
 * Retrieves the string representation of the cell with the given ID.
 * returns null if the cell is not found.
 * @param cellID
 * @constructor
 */
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


    const cell = activeSheet.Get(cellCol, cellRow);
    if (!cell) {
        console.debug("[GetRawCellContent] No cell found!");
        return null;
    }

    console.log("This is the cell", cell.GetText())
    // Special handling for Formula cells
    if (cell instanceof Formula) {
        console.log("This is a formula cell");
        let formulaText = cell.GetText()!;
        if (!formulaText.startsWith("=")) {
            formulaText = "=" + formulaText;
        }
        return formulaText;
    }

    const cellContent: string | null | undefined = activeSheet.Get(cellCol, cellRow)?.GetText();
    console.log("This is the cell content", cellContent)
    if (!cellContent && cellContent != "0") {
        console.debug("[GetRawCellContent] No cell found!");
        return null;
    }
    const colChar: string = numberToLetters(cellCol + 1);
    const cellHTML = document.getElementById(colChar +(cellRow+1) as string);
    if (!cellHTML) {
        console.debug("[GetRawCellContent] No cell found in frontend!");
        return null;
    }
    return cellContent
}


/**
 * Evaluates all cells in the viewport and updates the front-end.
 * This method is called every time the user scrolls the viewport.
 * @constructor
 */
export function EvalCellsInViewport(): void {
    const wb = WorkbookManager.getWorkbook();
    const sheet: Sheet = WorkbookManager.getActiveSheet()!;

    wb.Recalculate()

    if (!wb) {
        console.debug("[ShowWindowInGUI] No workbook found!");
        return;
    }

    if (sheet) {
        let cells = Array.from(document.getElementById("gridBody")!.querySelectorAll('div.Cell[contenteditable="true"]:not(.hide)'));

        for (let col: number = 0; col < cells.length; col++) {
            if (cells[col]) {
                const cellHTML = cells[col];
                if (cellHTML != null) {
                    const cell = sheet.Get(new A1RefCellAddress(cells[col].id));

                    // Skip active cell if it's not an ArrayFormula
                    if (cells[col].id == WorkbookManager.getActiveCell() && !(cell instanceof ArrayFormula)) {
                        continue;
                    }

                    if (cell != null) {
                        if (cell instanceof Formula) {
                            // Handle Formula cells

                            const cellVal = cell.getValue();
                            if (cellVal instanceof ErrorValue) {
                                cellHTML.textContent = cellVal.message;
                            } else if (cellVal == undefined) {

                                cellHTML.textContent = cell.GetText()!.replace("\n\n=","");
                            } else {
                                cellHTML.textContent = cell.getValue()?.ToObject() as string;
                            }
                        } else {
                            // Handle non-Formula cells
                            let cellEval = cell.Eval(sheet, 0, 0);
                            if (cellEval instanceof ErrorValue) {
                                cellHTML.textContent = cellEval.message;
                            } else if (cellEval != undefined) {
                                cellHTML.textContent = cellEval.ToObject() as string;
                            } else {
                                cellHTML.textContent = cell.GetText()!;
                            }
                        }
                    } else {
                        cellHTML.textContent = "";
                    }
                }
            }
        }
    }

/**
 *
    if (document.getElementById(WorkbookManager.getActiveCell()!)) {
        document.getElementById(WorkbookManager.getActiveCell()!)!.focus();
    }
        */
}
/**
 * Returns the supports in the viewport
 * Uses the ForEachReferred method to iterate through the support set of the cell.
 * @param col
 * @param row
 * @constructor
 */
export function GetSupportsInViewPort(col: number, row:number): string[] {
    let supports: string[] = []
    WorkbookManager.getActiveSheet()?.Get(col,row)?.ForEachReferred(WorkbookManager.getActiveSheet()!,col,row,((addr:FullCellAddress) => {
    supports.push(numberToLetters(addr.cellAddress.col + 1) + (addr.cellAddress.row + 1) as string);
    }));

    return supports;

}

export function ParseCellToBackend(content:string,columnIndex:number,rowIndex:number):boolean{
    const cellToBeAdded:Cell|null = Cell.Parse(content,WorkbookManager.getWorkbook(),columnIndex,rowIndex);
    if (!cellToBeAdded) {return false}
    WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.SetCell(cellToBeAdded, columnIndex, rowIndex);
    WorkbookManager.getWorkbook().Recalculate();
    return true
}

export function HandleArrayResult(columnIndex:number,rowIndex:number):boolean{
    //Handle Array Results for different cells.
    const cell = WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.Get(columnIndex, rowIndex);
    if (!cell) return false; // Check that the cell is not null
    const result = cell.Eval(WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())!, columnIndex, rowIndex);

    if (cell instanceof Formula && result instanceof ArrayExplicit) {
        console.log("This is an array formula:")
        WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.SetArrayFormula(
            cell, // cell
            columnIndex,
            rowIndex,
            new SuperCellAddress(columnIndex, rowIndex),
            new SuperCellAddress(columnIndex, rowIndex + result!.values[0].length - 1)
        )
    }
    return true;
}

export  function HandleArrayFormula(columnIndex:number,rowIndex:number):boolean{
    const checkCell = WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.Get(columnIndex, rowIndex);
    return !(checkCell instanceof ArrayFormula);
}