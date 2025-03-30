/*
  Currently, only Excel 2003 XMLSS format is supported.
 */
import { XMLParser } from "fast-xml-parser";
import {Workbook} from "./back-end/Workbook";
import {Sheet} from "./back-end/Sheet";
import {NumberCell, QuoteCell} from "./back-end/Cells";
import {numberToLetters} from "./front-end/virtualizedGrid.tsx";

//The XMLReader is used to read an XML file via the method readFile(xml_filename)
/*More in-depth explanation is as follows:
 * The readFile method makes use of the package fast-xml-parser to turn an XML file into a
 * JavaScript JSON Object. We then leaf through this object to extract workbooks, sheets,
 * cell addresses, values and types */
export class XMLReader {
    constructor() {}

    readFile(xmlString: string): void {
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

        for (let i = 0; i < sheets.length; i++) {
            const sheetName: string = sheets[i].Name;
            const sheet: Sheet = new Sheet(WorkbookManager.getWorkbook() as Workbook, sheetName, false); //what is up with all these constructors?
            (WorkbookManager.getWorkbook() as Workbook).AddSheet(sheet);

            let rows: RowType[] = [];
            if (Array.isArray(sheets[i].Table.Row)) {
                rows = sheets[i].Table.Row as RowType[];
            }
            else {
                rows.push(sheets[i].Table.Row as RowType);
            }

            let rowIndex = 0; //starts from 1 in XMLSS
            for (let g = 0; g < rows.length; g++) {
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
                let colIndex = 0;

                for (let f = 0; f < cells.length; f++) {
                    if (!cells[f]){
                        continue;
                    }

                    let cellContent: string | number | boolean | Date;
                    if (!cells[f].Index) {
                        colIndex++;
                    } else {
                        colIndex = Number(cells[f].Index);
                    }
                    if (cells[f].Formula) {
                        cellContent = cells[f].Formula as string;
                    } else {
                        cellContent = this.parseCellData(cells[f].Data);
                    }
                    const cellToBeAdded: QuoteCell | NumberCell =
                        typeof cellContent === "number" ? new NumberCell(cellContent as number) : new QuoteCell(cellContent as string);
                    sheet.SetCell(cellToBeAdded, colIndex as number, rowIndex as number);
                }
            }
        }
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

    static getWorkbook(): Workbook | null {
        console.log("[WorkbookManager] getWorkbook ->", this.instance);
        if (!this.instance) {
            this.instance = new Workbook();
            const baseSheet: Sheet = new Sheet(this.instance, "Sheet1", true);
            this.instance.AddSheet(baseSheet);
            }
        return this.instance;
    }

    static createNewWorkbook(): void {
        console.log("[WorkbookManager] createNewWorkbook");
        this.instance = new Workbook();
    }

    static setWorkbook(wb: Workbook): void {
        console.log("[WorkbookManager] setWorkbook ->", wb);
        this.instance = wb;
    }

    static notifyUpdate() {
        window.dispatchEvent(new Event("workbookUpdated"));
    }
}

//This is the method for retrieving cell data for the current view-port in the front-end.
//Updates on every scroll, meaning that the values are stored only in back-end, and then repeatedly fetched
//Makes sure that we only load data in the viewport, everything else stays in back-end.
export function ShowWindowInGUI(leftCornerCol: number, rightCornerCol:number, topCornerRow: number, bottomCornerRow: number):void {
    const wb = WorkbookManager.getWorkbook();
    if (!wb) {
        console.log("[ShowWindowInGUI] No workbook found!");
        return;
    }

    const startCol:number = leftCornerCol;
    const endCol:number = rightCornerCol;
    const startRow:number = topCornerRow;
    const endRow:number = bottomCornerRow;
    const sheet:Sheet|null = wb.get("Sheet1"); //This needs to be updated
    if (sheet) {
        for (let col: number = startCol; col < endCol ; col++) {
            for (let row: number = startRow; row < endRow; row++) {
                const colChar:string = numberToLetters(col);
                const cellHTML = document.getElementById(colChar + row);
                if (cellHTML != null) {
                    cellHTML.innerText = sheet.Show(col,row);
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