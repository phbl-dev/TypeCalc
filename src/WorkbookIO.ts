/*
  Currently, only Excel 2003 XMLSS format is supported.
 */
import { XMLParser } from "fast-xml-parser";
import {Workbook} from "./back-end/Workbook";
import {Sheet} from "./back-end/Sheet";
import {Cell, NumberCell, QuoteCell} from "./back-end/Cells";
import {numberToLetters} from "./front-end/virtualizedGrid.tsx";
import {A1RefCellAddress} from "./back-end/CellAddressing.ts";

//The XMLReader is used to read an XML file via the method readFile(xml_filename)
/*More in-depth explanation is as follows:
 * The readFile method makes use of the package fast-xml-parser to turn an XML file into a
 * JavaScript JSON Object. We then leaf through this object to extract workbooks, sheets,
 * cell addresses, values and types */
export class XMLReader {
    constructor() {}

    readFile(xmlString: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const parser: XMLParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true }); // attributeNamePrefix: "", removeNSPrefix: true
                const parsedData: WorkbookType = parser.parse(xmlString);
                let sheets: WorksheetType[] = []
                const parsedSheets:WorksheetType|WorksheetType[] = parsedData.Workbook.Worksheet;
                if (Array.isArray(parsedSheets)) {
                    sheets = parsedSheets;
                }
                else {
                    sheets.push(parsedSheets);
                }
                console.log("Number of sheets during read:" + sheets.length);
                for (let i: number = 0; i < sheets.length; i++) {
                    const sheetName: string = sheets[i].Name;
                    const sheet: Sheet = new Sheet(WorkbookManager.getWorkbook() as Workbook, sheetName, false); //what is up with all these constructors?
                    (WorkbookManager.getWorkbook() as Workbook).AddSheet(sheet);
                    console.log(sheetName);
                    let rows: RowType[] = [];
                    if (Array.isArray(sheets[i].Table.Row)) {
                        rows = sheets[i].Table.Row as RowType[];
                    } else {
                        rows.push(sheets[i].Table.Row as RowType);
                    }

                    let rowIndex: number = 0; //starts from 1 in XMLSS
                    for (let g: number = 0; g < rows.length; g++) {
                        let cells: CellType[] = [];
                        if (!rows[g].Index) {
                            rowIndex++;
                        } else {
                            rowIndex = rows[g].Index as number;
                        }

                        if (Array.isArray(rows[g].Cell)) {
                            cells = rows[g].Cell as CellType[];
                        } else {
                            cells.push(rows[g].Cell as CellType);
                        }
                        let colIndex: number = 0;

                        for (let f: number = 0; f < cells.length; f++) {
                            if (!cells[f]) {
                                continue;
                            }

                            // let cellContent: string | number | boolean | Date;
                            // if (!cells[f].Index) {
                            //     colIndex++;
                            // } else {
                            //     colIndex = Number(cells[f].Index);
                            // }
                            // if (cells[f].Formula) {
                            //     cellContent = cells[f].Formula as string;
                            // } else {
                            //     cellContent = this.parseCellData(cells[f].Data);
                            // }
                            // const cellToBeAdded: QuoteCell | NumberCell =
                            //     typeof cellContent === "number" ? new NumberCell(cellContent as number) : new QuoteCell(cellContent as string);
                            // sheet.SetCell(cellToBeAdded, colIndex as number, rowIndex as number);
                            let cellContent: string;
                            if (!cells[f].Index) {
                                colIndex++;
                            } else {
                                colIndex = Number(cells[f].Index);
                            }
                            if (cells[f].Formula) {
                                cellContent = cells[f].Formula as string;
                            } else {
                                cellContent = String(cells[f].Data["#text"]);
                            }
                            console.log("Reader sees this in cell");
                            console.log(cellContent);
                            console.log(typeof cellContent);
                            const cellToBeAdded:Cell|null = Cell.Parse(cellContent, WorkbookManager.getWorkbook() as Workbook, colIndex, rowIndex);
                            if (cellToBeAdded) {
                                sheet.SetCell(cellToBeAdded, colIndex - 1, rowIndex - 1);
                            }
                        }
                    }
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        })
    }

    //Essentially a type system for cell data input. Can probably be out-sourced to parser once that works.
    parseCellData(cellData: CellData): string | number | boolean | Date {
        if (!cellData.Type) {
            return cellData["#text"]; // If there's no type, return as-is
        }

        switch (cellData.Type) {
            case "Number":
                return Number(cellData["#text"]); // Convert to number
            case "Boolean":
                return cellData["#text"] === "1" || cellData["#text"] === "true"; // Convert to boolean
            case "DateTime":
                return new Date(cellData["#text"]); // Convert to Date object
            case "String": // Explicitly handled, but default case can also work
            default:
                return String(cellData["#text"]); // Ensure it's a string
        }
    }

}

//This is an overarching workbook used for all objects in the system.
//Follows a singleton dogma, since we really never need to have multiple workbooks at the same time.
export class WorkbookManager {
    private static instance: Workbook | null = null;
    private static activeSheet:string = "Sheet1";
    private static activeCell:string = "A1";

    static getWorkbook(): Workbook {
        if (!this.instance) {
            this.instance = new Workbook();
            const baseSheet: Sheet = new Sheet(this.instance, "Sheet1", 65536, 1048576, true);
            this.instance.AddSheet(baseSheet);
        }
        return this.instance;
    }

    static getActiveSheet():Sheet |null {
        if (!this.instance || !this.activeSheet) {
            this.instance = new Workbook();
            console.log("[WorkbookManager] Creating Workbook");
        }
        return this.instance.get(this.activeSheet);
    }

    static getActiveCell():string | null {
        return this.activeCell;
    }

    static setActiveCell(cell:string):void {
        this.activeCell = cell;
    }

    //static addSheet(sheetName:string):void {}

    static getActiveSheetName():string {
        return this.activeSheet;
    }

    static setActiveSheet(activeSheetName:string):void {
        this.activeSheet = activeSheetName;
    }

    static createNewWorkbook(): void {
        this.instance = new Workbook();
    }

    static getSheetNames():string[] {
        if (!this.instance) {
            console.error("[WorkbookManager] getSheets() can't see a workbook.");
            return [];
        }
        let sheetNames: string[] = [];
        this.instance.GetSheets().forEach((sheet: Sheet) => {
            sheetNames.push(sheet.getName());
        })
        return sheetNames;
    }

    static setWorkbook(wb: Workbook): void {
        console.log("[WorkbookManager] setWorkbook ->", wb);
        this.instance = wb;
    }

    static notifyUpdate() {
        window.dispatchEvent(new Event("workbookUpdated"));
    }
}

export function ParseToActiveCell(content:string):void {
    const a1Address:string | null = WorkbookManager.getActiveCell();
    if (!a1Address) {
        console.log("[WorkbookIO] ParseToActiveCell cant find active cell");
        return;
    }
    const activeSheet:Sheet|null= WorkbookManager.getActiveSheet();
    if (!activeSheet) {
        console.log("[WorkbookIO] ParseToActiveCell No activeSheet found!");
        return;
    }
    const ca:A1RefCellAddress = new A1RefCellAddress(a1Address);
    const cellCol:number = ca.col;
    const cellRow:number = ca.row;
    const cellToBeAdded:Cell | null = Cell.Parse(content, WorkbookManager.getWorkbook(), cellCol, cellRow);
    if (!cellToBeAdded) {
        console.log("[WorkbookIO] ParseToActiveCell cellToBeAdded not found!");
        return;
    }
    WorkbookManager.getWorkbook().get(WorkbookManager.getActiveSheetName())?.SetCell(cellToBeAdded, cellCol, cellRow);
}

export function GetRawCellContent(cellID:string):string|null {
    const ca:A1RefCellAddress = new A1RefCellAddress(cellID);
    const cellCol:number = ca.col;
    const cellRow:number = ca.row;
    const wb:Workbook = WorkbookManager.getWorkbook();
    if (!wb) {
        console.log("[GetRawCellContent] No workbook found!");
        return null;
    }
    const activeSheet:Sheet|null= WorkbookManager.getActiveSheet();
    if (!activeSheet) {
        console.log("[GetRawCellContent] No activeSheet found!");
        return null;
    }
    const cellContent:string | null | undefined = activeSheet.getCells().Get(cellCol,cellRow)?.GetText();
    if (!cellContent && cellContent != "0") {
        console.log("[GetRawCellContent] No cell found!");
        return null;
    }
    const colChar:string = numberToLetters(cellCol);
    const cellHTML = document.getElementById(colChar + cellRow);
    if (!cellHTML) {
        console.log("[GetRawCellContent] No cell found in frontend!");
        return null;
    }
    //cellHTML.innerText = cellContent;
    return cellContent
}

//This is the method for retrieving cell data for the current view-port in the front-end.
//Updates on every scroll, meaning that the values are stored only in back-end, and then repeatedly fetched
//Makes sure that we only load data in the viewport, everything else stays in back-end.
export function ShowWindowInGUI(activeSheet:string, leftCornerCol: number, rightCornerCol:number, topCornerRow: number, bottomCornerRow: number, sheetSwap:boolean):void {
    const wb = WorkbookManager.getWorkbook();
    if (!wb) {
        console.log("[ShowWindowInGUI] No workbook found!");
        return;
    }

    const startCol:number = leftCornerCol;
    const endCol:number = rightCornerCol;
    const startRow:number = topCornerRow;
    const endRow:number = bottomCornerRow;
    const sheet:Sheet = wb.get(activeSheet) as Sheet; //This needs to be updated
    if (sheet) {
        for (let col: number = startCol; col <= endCol ; col++) {
            for (let row: number = startRow; row <= endRow; row++) {
                const colChar:string = numberToLetters(col);
                const cellHTML = document.getElementById(colChar + row);
                if (cellHTML != null) {
                    WorkbookManager.getWorkbook().Recalculate();
                    let cellEval =  sheet.Get(col - 1,row - 1)?.Eval(sheet, 0, 0)?.ToObject();
                    if (cellEval != undefined) {
                        cellHTML.innerText = cellEval as string;
                    }
                    else if (sheetSwap) {
                        cellHTML.innerText = "";
                    }
                }
            }
        }
    }
}

//Interfaces for different datatypes used in the implementation.
interface CellData {
    "#text": string | number;
    Type?: "Number" | "String" | "Boolean" | "DateTime";
}

interface WorkbookType {
    Workbook: {
        Worksheet: WorksheetType[]; // An array of worksheets
    };
}

interface WorksheetType {
    Name: string;
    Table: TableType; //A WorkSheet SHOULD only have one table (test)
}

interface TableType {
    Row: RowType | RowType[]; //Can be a single row or an array of rows
}

interface RowType {
    Index?: number; // Optional, since it may not be present
    Cell: CellType | CellType[]; // Can be a single cell or an array of cells
}

interface CellType {
    Index?: number; // Optional, since it may not be present
    Formula?: string; // Optional, stores formulas if present
    Data: CellData;
}

//Handles when files are dropped in the dropzone in the browser,
//since React got implemented, this is the whole window.
export function dropHandler(ev:DragEvent) {
    const xmlReader:XMLReader = new XMLReader();

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    WorkbookManager.createNewWorkbook();

    if (ev.dataTransfer){
        const files:FileList = ev.dataTransfer.files;
        if (files.length === 0) return;
        const file:File = files[0];
        console.log(file.name);
        const reader = new FileReader();
        reader.onload = (e:ProgressEvent<FileReader>) => {
            if(!e.target){
                return;
            }
            const xmlContent = e.target.result as string;

            xmlReader.readFile(xmlContent);
        };
        reader.readAsText(file);
    }
}

//Handles when files are dragged over the drop zone (entire spreadsheet) in the browser
export function dragOverHandler(ev:DragEvent) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

export function pushCellToGUI(col:number, row:number, value: string | number | boolean | Date):void {
    const cellID = `${numberToLetters(col)}${row}`;
    localStorage.setItem(cellID, JSON.stringify(value));
}