import { WorkbookManager } from "../API-Layer/WorkbookManager.ts";
import { Cell as BackendCell } from "../back-end/Cells.ts";
import { SuperCellAddress } from "../back-end/CellAddressing.ts";

/**
 * Gets the HTML element based on a provided cell ID
 * @param cellID - the cell's ID, which is a string written in A1 notation
 */
export function getCell(cellID: string): HTMLElement | null {
    return document.getElementById(cellID);
}

/**
 * Converts a number to a letter or multiple (AA, AB, ..., AZ etc.)
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

/**
 * Converts letters to a number, following the same formula as above.
 * @param letters - The letters to convert
 */
export function lettersToNumber(letters: string): number {
    let output = 0;
    for (let i = 0; i < letters.length; i++) {
        const charCode = letters.charCodeAt(i) - 65;
        output = output * 26 + (charCode + 1);
    }
    return output;
}

/**
 * Takes in a formula string, (10, 20,-20, A1, A$2, $A$2), and processes it.
 * It is used to adjust the formula to account for the row and column changes.
 * @param formula
 * @param rowDiff
 * @param colDiff
 */
export function adjustFormula(
    formula: string,
    rowDiff: number,
    colDiff: number,
): string {
    return formula.replace(
        /(\$?)([A-Z]+)(\$?)(\d+)/g,
        (match, colAbs, column, rowAbs, row) => {
            const newRow = rowAbs ? row : parseInt(row, 10) + rowDiff;

            let newColumn = column;
            if (!colAbs && colDiff !== 0) {
                const colNum = lettersToNumber(column);
                const newColNum = colNum + colDiff;
                newColumn = numberToLetters(newColNum);

                if (newColNum <= 0) {
                    return;
                }
                console.log(
                    `Values inside adjustFormula: ${colNum}, ${newColNum}, ${newColumn}`,
                );
            }

            return colAbs + newColumn + rowAbs + newRow;
        },
    );
}

/**
 * The CellInfo type is used to store information about a cell.
 * It is used to store the cell's row, column, content, relative row and relative column.
 */
type CellInfo = {
    row: number;
    col: number;
    cell: BackendCell;
    content: string;
    relRow: number;
    relCol: number;
};

/**
 * Read area finds alls cells in the area and returns an array of CellInfo objects.
 * @constructor
 * @param startRow
 * @param endRow
 * @param startCol
 * @param endCol
 */
export function ReadArea(
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
) {
    let AreaArray: CellInfo[] = [];

    for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
            const cell = WorkbookManager.getActiveSheet()?.Get(j, i);
            if (cell) {
                AreaArray.push({
                    row: i,
                    col: j,
                    cell: cell,
                    content: cell.GetText()!,
                    relRow: i - startRow,
                    relCol: j - startCol,
                });
            }
        }
    }
    return AreaArray;
}
