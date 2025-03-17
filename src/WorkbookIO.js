"use strict";
/*
  An IOFormat determines how to read a given XML file containing a
  spreadsheet workbook.
  Currently, only Excel 2003 XMLSS format is supported.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.XMLReader = void 0;
var fast_xml_parser_1 = require("fast-xml-parser");
var fs_1 = require("fs");
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
//The XMLReader is used to read an XML file via the method readFile(xml_filename)
/*More in-depth explanation is as follows:
 * The readFile method makes use of the package fast-xml-parser to turn an XML file into a
 * JavaScript JSON Object. We then leaf through this object to extract workbooks, sheets,
 * cell addresses, values and types */
var XMLReader = /** @class */ (function () {
    function XMLReader() {
    }
    XMLReader.prototype.readFile = function (xml_filename) {
        var xmlString = (0, fs_1.readFileSync)(xml_filename, "utf8");
        var parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true }); // attributeNamePrefix: "", removeNSPrefix: true
        var parsedData = parser.parse(xmlString);
        //let workbook:Workbook = new Workbook();
        var sheets = parsedData.Workbook.Worksheet;
        //console.log(sheets);
        for (var i = 0; i < sheets.length; i++) {
            //console.log(sheets[i]);
            var sheetName = sheets[i].Name;
            //let sheet:Sheet = new Sheet(workbook, sheetName, false); //what is up with all these constructors?
            var rows = sheets[i].Table.Row;
            //console.log(rows.length);
            var rowIndex = 0; //starts from 1 in XMLSS
            for (var g = 0; g < rows.length; g++) {
                var cells = [];
                //console.log(rows[g]);
                if (!rows[g].Index) {
                    rowIndex++;
                }
                else {
                    rowIndex = rows[g].Index;
                }
                //console.log(rows[g].Cell);
                if (Array.isArray(rows[g].Cell)) {
                    cells = rows[g].Cell;
                }
                else {
                    cells.push(rows[g].Cell);
                }
                //const cells = rows[g].Cell;
                var cellIndex = 0;
                //console.log(cells);
                for (var f = 0; f < cells.length; f++) {
                    var cellValue = void 0;
                    if (!cells[f].Index) {
                        cellIndex++;
                    }
                    else {
                        cellIndex = cells[f].Index;
                    }
                    if (cells[f].Formula) {
                        cellValue = cells[f].Formula;
                    }
                    else {
                        cellValue = this.parseCellData(cells[f].Data);
                    }
                    // let cellToBeAdded:Cell = Cell.Parse(cellValue, workbook, rowIndex, cellIndex);
                    console.log("sheetName:", sheetName);
                    console.log("rowIndex:", rowIndex);
                    console.log("cellIndex:", cellIndex);
                    console.log("cellValue:", cellValue);
                    console.log("valueType:", typeof cellValue);
                }
            }
        }
        //workbook.AddSheet(sheet);
    };
    XMLReader.prototype.parseCellData = function (cellData) {
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
    };
    return XMLReader;
}());
exports.XMLReader = XMLReader;
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
