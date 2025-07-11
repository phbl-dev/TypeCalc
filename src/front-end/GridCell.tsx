import React, { useRef } from "react";
import {
    A1RefCellAddress,
    SuperCellAddress,
} from "../back-end/CellAddressing.ts";
import { WorkbookManager } from "../API-Layer/WorkbookManager.ts";
import { numberToLetters, ReadArea } from "./HelperFunctions.tsx";
import { makeBold, makeItalic, makeUnderlined } from "./SheetHeader.tsx";
import {
    EvalCellsInViewport,
    GetDependenciesInViewPort,
    GetRawCellContent,
    GetSupportsInViewPort,
    HandleArrayFormula,
    HandleArrayResult,
    ParseCellToBackend,
} from "../API-Layer/Back-endEndpoints.ts";

/**
 * Defines the props for the GridCell component.
 * @param columnIndex - Current column index, used to define cell ID
 * @param rowIndex - Current row index, used to define cell ID and determine cell background color
 * @param style - Lets the cell inherit the style from a css style sheet
 * @constructor
 */
interface GridCellProps {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
}

let selectionStartCell: string | null = null;
let AreaMarked = false;
let shiftKeyDown = false;
let showDependencies = false;

/** Defines the regular cell along with an ID in A1 format. It also passes on its ID when hovered over.
 * @param columnIndex - Current column index, used to define cell ID
 * @param rowIndex - Current row index, used to define cell ID and determine cell background color
 * @param style - Lets the cell inherit the style from a css style sheet
 * @constructor
 */
export const GridCell: React.FC<GridCellProps> = ({
    columnIndex,
    rowIndex,
    style,
}: GridCellProps) => {
    const ID = numberToLetters(columnIndex + 1) + (rowIndex + 1); // +1 to offset 0-index
    const [valueHolder, setValueHolder] = React.useState<string>("");

    const initialValueRef = useRef<string>("");

    // Passes the cell ID to the 'Go to cell' input box as its value of the
    const displayCellId = () => {
        const cellIdDisplay = document.getElementById(
            "cellIdInput",
        ) as HTMLInputElement;
        if (cellIdDisplay) {
            cellIdDisplay.value = ID;
        }
    };

    /**
     * Removes all cells from the class "support-cell"
     */
    const clearAllSupportCells = () => {
        const allSupportCells = document.querySelectorAll(".support-cell");
        allSupportCells.forEach((cell) => {
            cell.classList.remove("support-cell");
        });
    };

    /**
     * Removes all cells from the class "depend-cell"
     */
    const clearAllDependentCells = () => {
        const allSupportCells = document.querySelectorAll(".depend-cell");
        allSupportCells.forEach((cell) => {
            cell.classList.remove("depend-cell");
        });
    };

    /**
     * Clears the visual highlight of all cells in the range.
     * Only works if an area is selected.
     */
    const clearVisualHighlight = () => {
        const previousSelection = document.querySelectorAll(".selected-cell");
        previousSelection.forEach((cell) => {
            cell.classList.remove("selected-cell");
        });
    };

    const forceRefresh = (col: number, row: number) => {
        const currCellID = WorkbookManager.getActiveCell()!;
        const currCell = document.getElementById(currCellID);

        const nextCellID = numberToLetters(col + 1) + (row + 1);
        const nextCell = document.getElementById(nextCellID);
        const cellIdInput = document.getElementById(
            "cellIdInput",
        ) as HTMLInputElement;

        if (nextCell && cellIdInput) {
            nextCell.focus();
            cellIdInput.value = nextCellID;
        }

        if (currCell && cellIdInput) {
            currCell.focus();
            cellIdInput.value = currCellID;
        }
    };

    /**
     * Paste functionality. Based on the areaRef, it will paste the contents of the area into the current cell.
     * If multiple cells are part of the copied area, it will paste onto multiple cells.
     * If the copied area is a formula, it will adjust the formula to fit the current cell.
     * @param areaRef
     * @constructor
     */
    function PasteArea(areaRef: string) {
        const range = JSON.parse(areaRef);
        const targetCellRef = new A1RefCellAddress(ID);
        const sheet = WorkbookManager.getActiveSheet();

        const area = ReadArea(
            range.startRow,
            range.endRow,
            range.startCol,
            range.endCol,
        );

        if (!area) {
            return;
        }

        for (const cellInfo of area) {
            const { row, col, cell, content, relRow, relCol } = cellInfo;
            sheet!.PasteCell(
                cell,
                col,
                row,
                targetCellRef.col + relCol,
                targetCellRef.row + relRow,
                content,
            );
        }

        WorkbookManager.getWorkbook().Recalculate();
        EvalCellsInViewport();
        forceRefresh(range.startCol, range.startRow);

        AreaMarked = false;
    }

    /**
     * Cut functionality. Based on the areaRef, it will cut the contents of the area into the current cell.
     * If multiple cells are part of the copied area, it will cut onto multiple cells.
     * If the copied area is a formula, it will adjust the formula to fit the current cell.
     * @param areaRef
     * @constructor
     */
    function CutArea(areaRef: string) {
        const range = JSON.parse(areaRef);
        const targetCellRef = new A1RefCellAddress(ID);
        const sheet = WorkbookManager.getActiveSheet();

        const area = ReadArea(
            range.startRow,
            range.endRow,
            range.startCol,
            range.endCol,
        );

        if (!area) {
            return;
        }

        for (const cellInfo of area) {
            const { row, col, cell, content, relRow, relCol } = cellInfo;
            sheet!.CutCell(
                cell,
                col,
                row,
                targetCellRef.col + relCol,
                targetCellRef.row + relRow,
                content,
            );
        }

        WorkbookManager.getWorkbook().Recalculate();
        EvalCellsInViewport();
        forceRefresh(range.startCol, range.startRow);

        AreaMarked = false;
    }

    /**
     * Delete functionality. Based on the areaRef, it will delete the contents of the area.
     * If multiple cells are part of the copied area, it will delete onto multiple cells.
     * @param areaRef
     * @constructor
     */
    function DeleteArea(areaRef: string) {
        const range = JSON.parse(areaRef);

        const sheet = WorkbookManager.getActiveSheet();
        if (sheet) {
            sheet.ForEachInArea(
                range.startCol,
                range.startRow,
                range.endCol,
                range.endRow,
                (cell, col, row) => {
                    sheet.RemoveCell(col, row);
                },
            );
        }

        WorkbookManager.getWorkbook().Recalculate();

        EvalCellsInViewport();
        clearVisualHighlight();
        forceRefresh(range.startCol, range.startRow);

        AreaMarked = false;
    }

    /**
     * Enables all keyboard-related interaction, such as navigation with the arrow keys
     * and all the various keybindings for, e.g., copy-paste or undo/redo.
     * @param event - looks for events related to keyboard input like event.key or event.ctrlKey
     */
    const keyNav = (event: any): void => {
        let nextRow = rowIndex;
        let nextCol = columnIndex;
        let areaRef;

        /** Special case for Backspace and Delete keys. Required because the backspace key is used to delete cell contents and needs to be overwritten differently*/
        if (
            AreaMarked &&
            (event.key === "Backspace" || event.key === "Delete")
        ) {
            setHighlight(selectionStartCell!, true);
            areaRef = sessionStorage.getItem("selectionRange")!;
            DeleteArea(areaRef);
            clearVisualHighlight();
            AreaMarked = false;
        }

        if (event.ctrlKey) {
            switch (event.key) {
                case "z": // Undo functionality:
                    event.preventDefault();
                    WorkbookManager.getActiveSheet()?.undo();
                    EvalCellsInViewport();
                    break;

                case "y": // Redo functionality:
                    event.preventDefault();
                    WorkbookManager.getActiveSheet()?.redo();
                    EvalCellsInViewport();
                    break;

                case "c":
                    event.preventDefault();
                    if (AreaMarked) {
                        sessionStorage.removeItem("tmpCellRef");
                        setHighlight(selectionStartCell!, true);
                    } else {
                        setHighlight(ID, true);
                    }
                    break;

                case "x":
                    event.preventDefault();
                    areaRef = sessionStorage.getItem("selectionRange");
                    if (areaRef) {
                        CutArea(areaRef);
                    }
                    sessionStorage.removeItem("selectionRange");
                    break;

                case "v":
                    event.preventDefault();
                    areaRef = sessionStorage.getItem("selectionRange");
                    if (areaRef) {
                        PasteArea(areaRef);
                    }
                    break;
                case "b":
                    makeBold();
                    break;
                case "i":
                    makeItalic();
                    break;
                case "u":
                    makeUnderlined();
                    break;
                case "m":
                    showDependencies = !showDependencies;
                    if (showDependencies) {
                        showDeps();
                    } else {
                        clearAllDependentCells();
                    }
                    break;
            }
        }

        switch (event.key) {
            case "ArrowUp":
                nextRow = Math.max(0, rowIndex - 1);
                if (shiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false;
                }
                break;
            case "ArrowDown":
                nextRow = rowIndex + 1;
                if (shiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false;
                }
                break;
            case "ArrowLeft":
                nextCol = Math.max(0, columnIndex - 1);
                if (shiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false;
                }
                break;
            case "ArrowRight":
                nextCol = columnIndex + 1;
                if (shiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false;
                }
                break;
            case "Enter":
                nextRow = rowIndex + 1;
                break;
            case "Tab":
                nextCol = columnIndex + 1;
                break;
            case "Shift":
                selectionStartCell = WorkbookManager.getActiveCell();
                shiftKeyDown = true;
                break;
            default:
                return;
        }

        // After an arrow key is pressed, gets the next cell's ID and then the cell itself by the ID
        // so we can focus the cell. Also updates the cell ID displayed to show the current cell's ID.
        const nextCellID = numberToLetters(nextCol + 1) + (nextRow + 1);
        const nextCell = document.getElementById(nextCellID);
        const cellIdInput = document.getElementById(
            "cellIdInput",
        ) as HTMLInputElement;

        if (nextCell && cellIdInput) {
            nextCell.focus();
            cellIdInput.value = nextCellID;
            event.preventDefault(); // Prevents scrolling until edges are reached
        }
    };

    /**
     * Processes input into a specific cell location using its content, row, and column
     * @param rowIndex
     * @param columnIndex
     * @param content
     */
    const handleInput: (
        rowIndex: number,
        columnIndex: number,
        content: string,
    ) => void = (
        rowIndex: number,
        columnIndex: number,
        content: string,
    ): void => {
        if (!HandleArrayFormula(columnIndex, rowIndex)) {
            return;
        }
        if (!ParseCellToBackend(content, columnIndex, rowIndex)) {
            return;
        }
        if (!HandleArrayResult(columnIndex, rowIndex)) {
            return;
        }
    };

    /**
     * Updates the header FormulaBox with the values from within the active cell
     * @param cellID
     * @param content
     */
    const updateFormulaBox = (cellID: string, content: string | null): void => {
        const formulaBox = document.getElementById("formulaBox");
        if (!formulaBox) {
            return;
        }
        (formulaBox as HTMLInputElement).value = content as string;
    };

    function highlightSelectedCells(
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
    ) {
        for (let r = ulCa.row; r <= lrCa.row; r++) {
            for (let c = ulCa.col; c <= lrCa.col; c++) {
                const cellID = numberToLetters(c + 1) + (r + 1);
                const cell = document.getElementById(cellID);
                if (cell) {
                    cell.classList.add("selected-cell");
                }
            }
        }
    }

    /**
     * Highlights an area. If saveHighlight = true, it is saved as session storage
     * @param endCell
     * @param saveHighlight
     * @param arrowOptCol
     * @param arrowOptRow
     */
    function setHighlight(
        endCell: string,
        saveHighlight: boolean = false,
        arrowOptCol?: number,
        arrowOptRow?: number,
    ): void {
        const endCellRef = new A1RefCellAddress(endCell);
        const currentActiveCellRef =
            arrowOptCol !== undefined && arrowOptRow !== undefined
                ? new A1RefCellAddress(
                      numberToLetters(arrowOptCol + 1) + (arrowOptRow + 1),
                  )
                : new A1RefCellAddress(ID);

        const { ulCa, lrCa } = SuperCellAddress.normalizeArea(
            currentActiveCellRef,
            endCellRef,
        );

        clearVisualHighlight();
        highlightSelectedCells(ulCa, lrCa);

        if (saveHighlight) {
            sessionStorage.setItem(
                "selectionRange",
                JSON.stringify({
                    startCol: ulCa.col,
                    startRow: ulCa.row,
                    endCol: lrCa.col,
                    endRow: lrCa.row,
                }),
            );
        }
    }

    /**
     * Shows a cell's dependencies by fetching any dependencies in view port from the back-end
     * through the API-layer. It then adds any such dependencies to a class "depend-cell"
     */
    function showDeps() {
        if (showDependencies) {
            const myDependencies = GetDependenciesInViewPort(
                columnIndex,
                rowIndex,
            )!;

            if (myDependencies) {
                for (let i = 0; i < myDependencies.length; i++) {
                    const supportingCell = document.getElementById(
                        myDependencies[i],
                    );
                    if (
                        supportingCell &&
                        !supportingCell.classList.contains("depend-cell")
                    ) {
                        supportingCell.classList.add("depend-cell");
                    }
                }
            }
        }
    }

    return (
        <div
            className="Cell"
            contentEditable={true}
            id={ID}
            title={ID}
            style={{
                ...style, // Inherit style from style.css
                background: rowIndex % 2 === 0 ? "lightgrey" : "white", // Gives 'striped' look to grid body
            }}
            onFocus={(e) => {
                //All of this is to add and remove styling from the active cell¨

                const prev = WorkbookManager.getActiveCell();
                if (prev && prev !== ID) {
                    const old = document.getElementById(prev);
                    if (old) {
                        old.classList.remove("active-cell");
                    }
                }
                e.currentTarget.classList.add("active-cell");
                e.currentTarget.classList.add("hide-caret");

                // Save the initial value on focus and display it
                let rawCellContent: string | null = GetRawCellContent(ID);
                WorkbookManager.setActiveCell(ID);
                EvalCellsInViewport();
                if (!rawCellContent) {
                    //console.debug("[SpreadsheetGrid.tsx Cell] Cell Content not updated");
                    updateFormulaBox(ID, rawCellContent);
                    return;
                }
                rawCellContent = rawCellContent.trim();
                setValueHolder((e.target as HTMLElement).innerText.trim());
                initialValueRef.current = rawCellContent; //should not be innerText, but actual content from backEnd
                (e.target as HTMLInputElement).innerText = rawCellContent;
                updateFormulaBox(ID, rawCellContent);

                const mySupports = GetSupportsInViewPort(
                    columnIndex,
                    rowIndex,
                )!;
                showDeps();

                if (!mySupports) {
                    return;
                }
                for (let i = 0; i < mySupports.length; i++) {
                    const supportingCell = document.getElementById(
                        mySupports[i],
                    );
                    if (
                        supportingCell &&
                        !supportingCell.classList.contains("support-cell")
                    ) {
                        supportingCell.classList.add("support-cell");
                    }
                }
            }}
            onKeyDown={(e) => {
                keyNav(e);
            }}
            onMouseDown={() => {
                displayCellId();
                if (!shiftKeyDown) {
                    clearVisualHighlight();
                }
            }}
            onKeyUp={(e) => {
                if (e.key === "Shift") {
                    shiftKeyDown = false;
                }
            }}
            onBlur={(e) => {
                //Only update cell if the contents have changed!
                const newValue = (e.target as HTMLElement).innerText;
                if (newValue !== initialValueRef.current) {
                    handleInput(rowIndex, columnIndex, newValue);
                } else {
                    (e.target as HTMLElement).innerText = valueHolder;
                }
                clearAllSupportCells();
                clearAllDependentCells();
            }}
            //Update formula box alongside cell input, also show caret (text cursor) once writing starts
            onInput={(e) => {
                updateFormulaBox(ID, (e.target as HTMLElement).innerText);
                e.currentTarget.classList.remove("hide-caret");
                e.currentTarget.classList.add("show-caret");
            }}
        ></div>
    );
};
