import {WorkbookManager} from "../API-Layer/WorkbookManager.ts";

export function getCell(cellID:string):HTMLElement|null{
    return document.getElementById(cellID);
}

/** Converts a number to a letter or multiple (AA, AB, ..., AZ etc.)
 *
 * @param n - The number to convert
 */
export function numberToLetters(n: number) {
    let letter = "";
    while (n > 0) {
        n--; // Required so that 1 = 'A'
        letter = String.fromCharCode((n % 26) + 65) + letter;
        n = Math.floor(n / 26);
    }
    return letter;
}

/** Converts letters to a number, following the same formula as above.
 *
 * @param letters - The letters to convert
 */
export function lettersToNumber(letters:string):number {
    let output = 0;
    for (let i = 0; i < letters.length; i++) {
        const charCode = letters.charCodeAt(i) - 65;
        output = output * 26 + (charCode + 1);
    }
    return output;
}

export function exportAsCSV() {
    const currentSheet = WorkbookManager.getActiveSheet();
    const sheetData = currentSheet?.getCells();
    if(!sheetData) {return}
    let output: string = "";

    let currentRow = 1;
    let currentCol = 1;

    for(const cell of sheetData.iterateForExport()) {
        const cellRow = cell.GetRow();
        const cellCol = cell.GetCol();
        if(cellRow !== currentRow) {
            currentRow = cellRow!;
            output += "\n";
        }
        const diff = cellCol! - currentCol;
        currentCol = cellCol!;
        for(let i = 0; i < diff; i++){
            output += ",";
        }

        output += cell.GetText();
    }

    const blob = new Blob([output], {type: "application/csv"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "workbook.csv";
    link.click();
}

export function exportAsXML() {
    let xmlOutput =
        "<?xml version=\"1.0\"?>\n" +
        "<?mso-application progid=\"Excel.Sheet\"?>\n" +
        "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\"\n" +
        " xmlns:o=\"urn:schemas-microsoft-com:office:office\"\n" +
        " xmlns:x=\"urn:schemas-microsoft-com:office:excel\"\n" +
        " xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"\n" +
        " xmlns:html=\"http://www.w3.org/TR/REC-html40\">\n";

    xmlOutput +=
        " <DocumentProperties xmlns=\"urn:schemas-microsoft-com:office:office\">\n" +
        "  <Author>Generated Export</Author>\n" +
        "  <Created>" + new Date().toISOString() + "</Created>\n" +
        " </DocumentProperties>\n";

    xmlOutput +=
        " <Styles>\n" +
        "  <Style ss:ID=\"Default\" ss:Name=\"Normal\">\n" +
        "   <Alignment ss:Vertical=\"Bottom\"/>\n" +
        "   <Borders/>\n" +
        "   <Font/>\n" +
        "   <Interior/>\n" +
        "   <NumberFormat/>\n" +
        "   <Protection/>\n" +
        "  </Style>\n" +
        " </Styles>\n";

    const sheetNames = WorkbookManager.getSheetNames();

    for(const sheetName of sheetNames) {
        // Escape special characters in sheetName
        const escapedSheetName = sheetName.replace(/&/g, '&amp;') // Escape &
            .replace(/</g, '&lt;') // Escape <
            .replace(/>/g, '&gt;') // Escape >
            .replace(/"/g, '&quot;') // Escape "
            .replace(/'/g, '&apos;'); // Escape '

        const xmlSheetHeader =
            `  <Worksheet ss:Name="${escapedSheetName}">\n` +
            "   <Table ss:ExpandedColumnCount=\"1000\" ss:ExpandedRowCount=\"1000\" x:FullColumns=\"1\" x:FullRows=\"1\">\n";
        xmlOutput += xmlSheetHeader;

        const sheet = WorkbookManager.getWorkbook().getSheet(sheetName);
        if(!sheet) {continue;} // Skip invalid sheets

        const sheetCells = sheet.getCells();
        let currentRow = -1; // Instantiate with an invalid row number
        let newRow = false; //TODO: Test om 

        for(const cell of sheetCells.iterateForExport()) {
            const cellRow = cell.GetRow();

            // If the row changes, close the row and start a new one
            if(cellRow !== currentRow) {
                if(newRow)
                    xmlOutput += "\n     </Row>";
                currentRow = cellRow!;
                xmlOutput += `\n     <Row ss:Index="${cellRow}" ss:AutoFitHeight="0">`;
                newRow = true;
            }

            const cellContent = cell.GetText();
            const cellCol = cell.GetCol();

            // Determine cell data type, with String as default
            let cellType = "String";
            let cellValue = cellContent;

            // Try to detect numbers, if any change dataType to Number
            if(/^-?\d+(\.\d+)?$/.test(cellContent!))
                cellType = "Number";

            // If the cell is a String, escape special characters
            if(cellType === "String") {
                cellValue = cellContent!.replace(/&/g, '&amp;') // Escape &
                    .replace(/</g, '&lt;') // Escape <
                    .replace(/>/g, '&gt;') // Escape >
                    .replace(/"/g, '&quot;') // Escape "
                    .replace(/'/g, '&apos;'); // Escape '
            }

            xmlOutput += `\n      <Cell ss:Index="${cellCol}"><Data ss:Type="${cellType}">${cellValue}</Data></Cell>`;
        }

        // Close the last row
        if(newRow)
            xmlOutput += "\n     </Row>";

        const xmlSheetFooter =
            "\n   </Table>\n" +
            "  </Worksheet>\n";
        xmlOutput += xmlSheetFooter;
    }

    const xmlFooter = "</Workbook>";
    xmlOutput += xmlFooter;

    const blob = new Blob([xmlOutput], {type: "application/xml"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "workbook.xml";
    link.click();
}

/**
 * Takes in a formula string, (10, 20,-20, A1, A$2, $A$2), and processes it.
 * It only processes the changes needed
 * @param formula
 * @param rowDiff
 * @param colDiff
 */
export function adjustFormula(formula: string, rowDiff: number, colDiff: number): string {
    return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, (match, colAbs, column, rowAbs, row) => {
        const newRow = rowAbs ? row : parseInt(row, 10) + rowDiff;

        let newColumn = column;
        if (!colAbs && colDiff !== 0) {
            const colNum = lettersToNumber(column);
            const newColNum = colNum + colDiff;
            newColumn = numberToLetters(newColNum);

            if(newColNum <= 0) {
                return
            }
            console.log(`Values inside adjustFormula: ${colNum}, ${newColNum}, ${newColumn}`)
        }
        return colAbs + newColumn + rowAbs + newRow;
    });
}


// The following 5 functions are for styling the cell and its contents.
// They are connected to the appropriate buttons in the header.
export function makeBold() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    let button = document.getElementById("bold");
    if (!cell || !button) { return null; }

    if (cell.style.fontWeight === "bold") {
        cell.style.fontWeight = "normal";
        button.style.outline = "none";
    }
    else {
        cell.style.fontWeight = "bold";
        button.style.outline = "2px solid white";
    }
}
export function makeItalic() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    let button = document.getElementById("italic");
    if (!cell || !button) { return null; }

    if (cell.style.fontStyle === "italic") {
        cell.style.fontStyle = "normal";
        button.style.outline = "none";
    }
    else {
        cell.style.fontStyle = "italic";
        button.style.outline = "2px solid white";
    }
}
export function makeUnderlined() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    let button = document.getElementById("underline");
    if (!cell || !button) { return null; }

    if (cell.style.textDecoration === "underline") {
        cell.style.textDecoration = "none";
        button.style.outline = "none";
    }
    else {
        cell.style.textDecoration = "underline";
        button.style.outline = "2px solid white";
    }
}
export function setCellColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById("cellColorPicker") as HTMLInputElement;
    if (!cell || !colorPicker) { return null; }

    if(colorPicker.value) {
        cell.style.backgroundColor = colorPicker.value;
    }
}
export function setTextColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById("textColorPicker") as HTMLInputElement;
    if (!cell || !colorPicker) { return null; }

    if(colorPicker.value) {
        cell.style.color = colorPicker.value;
    }
}