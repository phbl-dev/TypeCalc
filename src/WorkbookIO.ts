/*
  An IOFormat determines how to read a given XML file containing a
  spreadsheet workbook.
  Currently, only Excel 2003 XMLSS format is supported.
 */

import { XMLParser } from "fast-xml-parser";
import {Workbook} from "./back-end/Workbook";
import {Sheet} from "./back-end/Sheet";
import {NumberCell, QuoteCell} from "./back-end/Cells";
import {numberToLetters} from "./virtualizedGrid";


// //Abstract class primarily AI-generated, though I checked the buffer methods in the node.js documentation
// //If any issues look at this again.
// abstract class IOFormat {
//     protected fileExtension: string;
//     protected description: string;
//
//     constructor(fileExtension: string, description: string) {
//         this.fileExtension = fileExtension;
//         this.description = description;
//     }
//
//     public abstract read(filename: string): Workbook;
//
//     //TypeScript uses Buffer for fixed-length byte sequences. The buffer.from() method
//     //takes the length from the string implicitly.
//     public static makeStream(s: string): Buffer {
//         const buffer:Buffer = Buffer.from(s, 'utf-8');
//         return buffer;
//     }
//
//     public getFilter(): string {
//         return `${this.description} (*.${this.fileExtension})|*.${this.fileExtension}`;
//     }
//
//     public validExtension(ext: string): boolean {
//         return this.fileExtension === ext;
//     }
// }

//This is not how we want to do it, but the links right now are messy



//The XMLReader is used to read an XML file via the method readFile(xml_filename)
/*More in-depth explanation is as follows:
 * The readFile method makes use of the package fast-xml-parser to turn an XML file into a
 * JavaScript JSON Object. We then leaf through this object to extract workbooks, sheets,
 * cell addresses, values and types */
export class XMLReader {
    constructor() {}

    readFile(xmlString: string): void {
        // console.log(xmlString);
        //createOverarchingWorkbook();

        const parser: XMLParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true }); // attributeNamePrefix: "", removeNSPrefix: true
        const parsedData: WorkbookType = parser.parse(xmlString);
        const sheets: WorksheetType[] = parsedData.Workbook.Worksheet;

        // let sheets: WorksheetType[] = [];
        // if (Array.isArray(parsedData.Workbook.Worksheet)) {
        //     sheets = parsedData.Workbook.Worksheet;
        // }
        // else { sheets.push(parsedData.Workbook.Worksheet) }

        for (let i: number = 0; i < sheets.length; i++) {
            //console.log(sheets[i]);
            const sheetName: string = sheets[i].Name;
            const sheet: Sheet = new Sheet(WorkbookManager.getWorkbook() as Workbook, sheetName, 100, 100, false); //what is up with all these constructors?
            (WorkbookManager.getWorkbook() as Workbook).AddSheet(sheet);
            //console.log(wb);
            //console.log(wb.get(sheetName))
            let rows: RowType[] = [];
            if (Array.isArray(sheets[i].Table.Row)) {
                rows = sheets[i].Table.Row as RowType[];
            }
            else {
                rows.push(sheets[i].Table.Row as RowType);
            }
            //console.log(rows);
            let rowIndex: number = 0; //starts from 1 in XMLSS
            for (let g: number = 0; g < rows.length; g++) {
                //console.log(rows[g]);
                let cells: CellType[] = [];
                //console.log(rows[g]);
                if (!rows[g].Index) {
                    rowIndex++;
                } else {
                    rowIndex = rows[g].Index as number;
                }
                //console.log(rows[g].Cell);
                if (Array.isArray(rows[g].Cell)) {
                    cells = rows[g].Cell as CellType[];
                } else {
                    cells.push(rows[g].Cell as CellType);
                }
                //const cells = rows[g].Cell;
                let colIndex: number = 0;
                //console.log(cells)
                //console.log(cells);
                for (let f: number = 0; f < cells.length; f++) {
                    if (!cells[f]){
                        continue;
                    }
                    //console.log(f);
                    //console.log(cells[f]);
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
                    let cellToBeAdded: QuoteCell | NumberCell =
                        typeof cellContent === "number" ? new NumberCell(cellContent as number) : new QuoteCell(cellContent as string);
                    //console.log(cellToBeAdded.showValue(sheet, colIndex as number, rowIndex));
                    //This is not the way we want to do it in the end. Needs upgrade when parser works.
                    sheet.SetCell(cellToBeAdded, colIndex as number, rowIndex as number);
                    // let cellToBeAdded:Cell = Cell.Parse(cellContent, workbook, rowIndex, cellIndex);
                    // console.log("sheetName:", sheetName);
                    // console.log("rowIndex:", rowIndex);
                    // console.log("cellIndex:", colIndex);
                    // console.log("cellContent:", cellContent);
                    // console.log("contentType:", typeof cellContent);
                    //pushCellToGUI(colIndex, rowIndex, cellContent);
                }
                // sheet.ShowAll((col, row, value) => {
                //     console.log(`Cell (${col}, ${row}): ${value}`);
                // });
            }
            //newTable();
        }
        console.log("[readFile] Final workbook contents:", WorkbookManager.getWorkbook());
        //WorkbookManager.notifyUpdate();
    }
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

export class WorkbookManager {
    private static instance: Workbook | null = null;

    static getWorkbook(): Workbook | null {
        console.log("[WorkbookManager] getWorkbook ->", this.instance);
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

export function ShowWindowInGUI(leftCornerCol: number, rightCornerCol:number, topCornerRow: number, bottomCornerRow: number):void {
    const wb = WorkbookManager.getWorkbook();
    console.log("[ShowWindowInGUI] Retrieved workbook:", wb);

    if (!wb) {
        console.log("[ShowWindowInGUI] No workbook found!");
        return;
    }
    const startCol:number = leftCornerCol;
    const endCol:number = rightCornerCol;
    const startRow:number = topCornerRow;
    const endRow:number = bottomCornerRow;
    console.log("Calling get");
    const sheet = wb.get("Sheet1");
    console.log("[ShowWindowInGUI] Sheet1:", sheet);
    //console.log(workbook);
    //console.log(currentSheet);
    if (sheet) {
        for (let col: number = startCol; col < endCol ; col++) {
            for (let row: number = startRow; row < endRow; row++) {
                console.log("this happens");
                let colName:string = numberToLetters(col);
                let cellHTML = document.getElementById(colName + row);
                if (cellHTML != null) {
                    cellHTML.innerText = sheet.Show(col,row);
                }
            }
        }
    }
}



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
    Table: TableType;
}

interface TableType {
    Row: RowType | RowType[];
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

//Handles when files are dropped in the dropzone in the browser
export function dropHandler(ev:DragEvent) {
    let xmlReader:XMLReader = new XMLReader();
    console.log("File(s) dropped");

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

            //createOverarchingWorkbook();
            xmlReader.readFile(xmlContent);
            //console.log(overarchingWorkbook);
        };
        reader.readAsText(file);
    }
    //WorkbookManager.notifyUpdate();
    console.log("workbook in dropHandler", WorkbookManager.getWorkbook());
}

//Handles when files are dragged over the drop zone in the browser
export function dragOverHandler(ev:DragEvent) {
    console.log("File(s) in drop zone");

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

export function pushCellToGUI(col:number, row:number, value: string | number | boolean | Date):void {
    const cellID = `${numberToLetters(col)}${row}`;
    localStorage.setItem(cellID, JSON.stringify(value));
}

// const xmltest = new XMLReader();
// xmltest.readFile("../extra_files/Testfile for Thesis.xml");


// export class XMLSSIO extends IOFormat {
//     private static readonly MINROWS: number = 10;
//     private static readonly MINCOLS: number = 10;
//
//     readonly formats:Formats;
//
//     constructor() {
//         super("xml", "XMLSS");
//         this.formats = new Formats();
//         this.formats.setRefFmt("R1C1");
//     }
//
//     public parseRow(
//         rowXml: string,
//         sheet: Sheet,
//         row: number,
//         cellParsingCache: Map<string, Cell>
//     ): number {
//         let cellCount:number = 0;
//         let col:number = 0;
//
//         const parser = new XMLParser({ ignoreAttributes: false });
//         const rowData = parser.parse(rowXml); // Parse XML row into JS object
//
//         if (!rowData.Row || !rowData.Row.Cell) return 0;
//
//         const cells = Array.isArray(rowData.Row.Cell) ? rowData.Row.Cell : [rowData.Row.Cell];
//
//         for (const cellNode of cells) {
//             let colIndexStr:string = cellNode['@_ss:Index'];
//             //let arrayRangeStr = cellNode['@_ss:ArrayRange'];
//             //let formulaStr = cellNode['@_ss:Formula'];
//             let typeStr = "";
//             let dataVal = "";
//
//             if (colIndexStr !== undefined) {
//                 const parsedCol = parseInt(colIndexStr, 10);
//                 col = isNaN(parsedCol) ? 0 : parsedCol;
//             } else {
//                 col++;
//             }
//
//             cellCount++;
//
//             // Prevent overwriting array formula results
//             if (sheet.getCell(col - 1, row - 1)) continue;
//
//             // Extract Data if present
//             if (cellNode.Data) {
//                 typeStr = cellNode.Data['@_ss:Type'] || "";
//                 dataVal = cellNode.Data['#text'] || "";
//             }
//
//             let cellString = formulaStr ? formulaStr : dataVal;
//
//             // Ensure string values are formatted correctly
//             if (!formulaStr && typeStr === "String") {
//                 dataVal = "'" + dataVal;
//             }
//
//             if (!cellString) continue; // Skip blank cells
//
//             let cell: Cell;
//             if (cellParsingCache.has(cellString)) {
//                 cell = cellParsingCache.get(cellString)!.cloneCell(col - 1, row - 1);
//             } else {
//                 cell = Cell.Parse(cellString, this.wb, col, row);
//                 if (!cell) {
//                     console.warn(`BAD: Null cell from "${cellString}"`);
//                 } else {
//                     cellParsingCache.set(cellString, cell);
//                 }
//             }
//
//             // Handle array formulas WE WAIT WITH THIS
//             // if (arrayRangeStr && cell instanceof Formula) {
//             //     const split = arrayRangeStr.split(":");
//             //     const raref1 = new RARef(split[0]);
//             //     const raref2 = split.length === 1 ? new RARef(split[0]) : new RARef(split[1]);
//             //
//             //     if (raref1 && raref2) {
//             //         const ulCa = raref1.addr(col - 1, row - 1);
//             //         const lrCa = raref2.addr(col - 1, row - 1);
//             //         sheet.SetArrayFormula(cell, col - 1, row - 1, ulCa, lrCa);
//             //     }
//             // } else {
//             //     sheet.SetCell(cell, col - 1, row - 1);
//             // }
//         }
//         return cellCount;
//     }
// }
