
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
                return "'[FIX IN adjustFormula]'"
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