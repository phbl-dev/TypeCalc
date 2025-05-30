import { XMLParser } from "fast-xml-parser";
import { Workbook } from "../back-end/Workbook.ts";
import { Sheet } from "../back-end/Sheet.ts";
import { Cell, NumberCell } from "../back-end/Cells.ts";
import { WorkbookManager } from "./WorkbookManager.ts";

/**
 *  The readFile method makes use of the package fast-xml-parser to turn an XML file into a
 *  JavaScript JSON Object. We then leaf through this object to extract workbooks, sheets,
 *  cell addresses, values and types
 * @constructor
 * @param xml_filename The name of the XML file to be read.
 * @returns A Promise that resolves when the file is read.
 * @throws An error if the file cannot be read.
 * @note Currently, only Excel 2003 XMLSS format is supported.
 */
export class XMLReader {
  constructor() {}

  readFile(xmlString: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const parser: XMLParser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "",
          removeNSPrefix: true,
        }); // attributeNamePrefix: "", removeNSPrefix: true
        const parsedData: WorkbookType = parser.parse(xmlString);
        let sheets: WorksheetType[] = [];
        const parsedSheets: WorksheetType | WorksheetType[] =
          parsedData.Workbook.Worksheet;
        if (Array.isArray(parsedSheets)) {
          sheets = parsedSheets;
        } else {
          sheets.push(parsedSheets);
        }
        console.log("Number of sheets during read:" + sheets.length);
        for (let i: number = 0; i < sheets.length; i++) {
          const sheetName: string = sheets[i].Name;
          const sheet: Sheet = new Sheet(
            WorkbookManager.getWorkbook() as Workbook,
            sheetName,
            false,
          ); //what is up with all these constructors?
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
              const cellToBeAdded: Cell | null = Cell.Parse(
                cellContent,
                WorkbookManager.getWorkbook() as Workbook,
                colIndex,
                rowIndex,
              );
              if (cellToBeAdded) {
                sheet.SetCell(cellToBeAdded, colIndex - 1, rowIndex - 1);
              }
            }
          }
        }
        WorkbookManager.getWorkbook().Recalculate();
        //EvalCellsInViewport();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
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


/**
 * Contains our two file exporting functions for exporting workbook contents
 * as either an XMLSS or a CSV file.
 */
export class XMLWriter {
  constructor() {}

  /**
   * Exports the workbook contents as an Excel 2003 XML File (XMLSS).
   */
  exportAsXML(): void {
    let xmlOutput: string =
      '<?xml version="1.0"?>\n' +
      '<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
      ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
      ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';

    xmlOutput +=
      ' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n' +
      "  <Author>TypeCalc Export</Author>\n" +
      "  <Created>" +
      new Date().toISOString() +
      "</Created>\n" +
      " </DocumentProperties>\n";

    xmlOutput +=
      " <Styles>\n" +
      '  <Style ss:ID="Default" ss:Name="Normal">\n' +
      '   <Alignment ss:Vertical="Bottom"/>\n' +
      "   <Borders/>\n" +
      "   <Font/>\n" +
      "   <Interior/>\n" +
      "   <NumberFormat/>\n" +
      "   <Protection/>\n" +
      "  </Style>\n" +
      " </Styles>\n";

    const sheetNames: string[] = WorkbookManager.getSheetNames();

    for (const sheetName of sheetNames) {
      // Escape special characters in sheetName
      const escapedSheetName = sheetName
        .replace(/&/g, "&amp;") // Escape &
        .replace(/</g, "&lt;") // Escape <
        .replace(/>/g, "&gt;") // Escape >
        .replace(/"/g, "&quot;") // Escape "
        .replace(/'/g, "&apos;"); // Escape '

      const xmlSheetHeader: string =
        `  <Worksheet ss:Name="${escapedSheetName}">\n` +
        '   <Table ss:ExpandedColumnCount="1000" ss:ExpandedRowCount="1000" x:FullColumns="1" x:FullRows="1">\n';
      xmlOutput += xmlSheetHeader;

      const sheet: Sheet|null = WorkbookManager.getWorkbook().getSheet(sheetName);
      if (!sheet) {continue;} // Skip invalid sheets

      const sheetCells = sheet.getCells();
      let currentRow: number = -1; // Instantiate with an invalid row number
      let firstRow: boolean = true; // Used to create the first <Row> without a closing </Row> before it

      for (const cell of sheetCells.iterateForExport()) {
        const cellRow: number|null = cell.GetRow();

        // If the row changes, close the row and start a new one
        if (cellRow !== currentRow) {
          if (firstRow) {
            firstRow = false;
            currentRow = cellRow!;
            xmlOutput += `\n     <Row ss:Index="${cellRow}" ss:AutoFitHeight="0">`;
          } else {
            xmlOutput += "\n     </Row>";
            currentRow = cellRow!;
            xmlOutput += `\n     <Row ss:Index="${cellRow}" ss:AutoFitHeight="0">`;
          }
        }

        let cellContent: string|null = cell.GetText();
        const cellCol: number|null = cell.GetCol();

        // Determine cell data type, with String as default
        let cellType: string = "String";
        if (cell instanceof NumberCell) {
          cellType = "Number";
        }

        // If the cell is a String, escape special characters
        if (cellType === "String") {
          cellContent = cellContent!
            .replace(/&/g, "&amp;") // Escape &
            .replace(/</g, "&lt;") // Escape <
            .replace(/>/g, "&gt;") // Escape >
            .replace(/"/g, "&quot;") // Escape "
            .replace(/'/g, "&apos;"); // Escape '
        }
        xmlOutput += `\n      <Cell ss:Index="${cellCol}"><Data ss:Type="${cellType}">${cellContent}</Data></Cell>`;
      }

      // Close the last row
      xmlOutput += "\n     </Row>";

      const xmlSheetFooter: string = "\n   </Table>\n" + "  </Worksheet>\n";
      xmlOutput += xmlSheetFooter;
    }

    const xmlFooter = "</Workbook>";
    xmlOutput += xmlFooter;

    const blob = new Blob([xmlOutput], { type: "application/xml" });
    const link: HTMLAnchorElement = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "workbook.xml";
    link.click();
  }

  /**
   * Exports the active sheet's contents as a CSV file.
   */
  exportAsCSV() {
    const currentSheet: Sheet|null = WorkbookManager.getActiveSheet();
    const sheetData = currentSheet?.getCells();
    if (!sheetData) {
      return;
    }
    let output: string = "";

    let currentRow: number = 1;
    let currentCol: number = 1;

    for (const cell of sheetData.iterateForExport()) {
      const cellRow: number|null = cell.GetRow();
      const cellCol: number|null = cell.GetCol();
      if (cellRow !== currentRow) {
        currentRow = cellRow!;
        currentCol = 1;
        output += "\n";
      }
      const diff: number = cellCol! - currentCol;
      currentCol = cellCol!;
      for (let i: number = 0; i < diff; i++) {
        output += ",";
      }

      output += cell.GetText();
    }

    const blob = new Blob([output], { type: "application/csv" });
    const link: HTMLAnchorElement = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "workbook.csv";
    link.click();
  }
}
