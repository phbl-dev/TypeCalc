/*
  Currently, only Excel 2003 XMLSS format is supported.
 */
import {XMLParser} from "fast-xml-parser";
import {Workbook} from "./back-end/Workbook";
import {Sheet} from "./back-end/Sheet";
import {Cell} from "./back-end/Cells";
import {numberToLetters} from "./front-end/HelperFunctions.tsx";
import {WorkbookManager} from "./API-Layer.ts";

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

