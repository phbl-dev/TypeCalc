import React, {useEffect, useRef} from "react";
import {A1RefCellAddress} from "../back-end/CellAddressing.ts";
import {Formula} from "../back-end/Cells.ts";
import {WorkbookManager} from "../API-Layer/WorkbookManager.ts";
import {adjustFormula, makeBold, makeItalic,
        makeUnderlined, numberToLetters, ReadArea} from "./HelperFunctions.tsx";
import {EvalCellsInViewport, GetRawCellContent, GetSupportsInViewPort,
        HandleArrayFormula, HandleArrayResult, ParseCellToBackend} from "../API-Layer/Back-endEndpoints.ts";

interface GridCellProps {
    columnIndex:number,
    rowIndex: number,
    style: React.CSSProperties;
}

let selectionStartCell: string | null = null
let isShiftKeyDown = false
let AreaMarked = false

/** Defines the regular cell along with an ID in A1 format. It also passes on its ID when hovered over.
 * @param columnIndex - Current column index, used to define cell ID
 * @param rowIndex - Current row index, used to define cell ID and determine cell background color
 * @param style - Lets the cell inherit the style from a css style sheet
 * @constructor
 */
export const GridCell: React.FC<GridCellProps> = ({ columnIndex, rowIndex, style }: GridCellProps) => {
    const ID = numberToLetters(columnIndex + 1) + (rowIndex + 1); // +1 to offset 0-index
    const [valueHolder, setValueHolder] = React.useState<string>("");
    const [mySupports, setMySupports] = React.useState<string[]>([])
    let initialValueRef = useRef<string>("");

    useEffect(() => {
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                isShiftKeyDown = false;
                console.log('Shift released', isShiftKeyDown);
            }
        });
    }, []);

    // Passes the cell ID to the 'Go to cell' input box as its value of the
    const displayCellId = () => {
        const cellIdDisplay = document.getElementById("cellIdInput") as HTMLInputElement;
        if(cellIdDisplay) {
            cellIdDisplay.value = ID;
        }
    }

    /**
     * Clears the visual highlight of all cells in the range.
     * Only works if an area is selected.
     */
    const clearVisualHighlight = () => {
        const previousSelection = document.querySelectorAll('.selected-cell');
        previousSelection.forEach(cell => {
            cell.classList.remove('selected-cell');
        });
    }

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

        for (const cellInfo of ReadArea(range.startRow, range.endRow, range.startCol, range.endCol)) {
            const { row, col, cell, content, relRow, relCol } = cellInfo;
            const targetRow = targetCellRef.row + relRow;
            const targetCol = targetCellRef.col + relCol;

            if (cellInfo.cell instanceof Formula) {
                const nextFormula = adjustFormula(
                    content!,
                    targetRow - row,
                    targetCol - col
                );

                let newCell:HTMLElement = document.getElementById(numberToLetters(targetCol + 1) + (targetRow + 1).toString())!;
                handleInput(targetRow, targetCol, nextFormula!);

                if (newCell!.classList.contains("active-cell")){
                    (newCell as HTMLInputElement).innerText = nextFormula as string;
                }
            }
            else {
                handleInput(targetRow, targetCol, content!);
            }
            EvalCellsInViewport(columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20);

        }

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

        for (const cellInfo of ReadArea(range.startRow, range.endRow, range.startCol, range.endCol)) {
            const { row, col, cell, content, relRow, relCol } = cellInfo;
            const targetRow = targetCellRef.row + relRow;
            const targetCol = targetCellRef.col + relCol;

            // If cell is a formula
            if (cellInfo.cell instanceof Formula) {
                const nextFormula = adjustFormula(
                    content!,
                    targetRow - row,
                    targetCol - col
                );
                let newCell:HTMLElement = document.getElementById(numberToLetters(targetCol + 1) + (targetRow + 1).toString())!;
                handleInput(targetRow, targetCol, nextFormula!);
                WorkbookManager.getActiveSheet()?.RemoveCell(col, row);
                if (newCell!.classList.contains("active-cell")){
                    (newCell as HTMLInputElement).innerText = nextFormula as string;
                }
            }
            else {
                WorkbookManager.getActiveSheet()?.MoveCell(col, row, targetCol, targetRow);
            }
            EvalCellsInViewport(columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20);

        }
        clearVisualHighlight();

        AreaMarked = false;
    }

    /**
     * Delete functionality. Based on the areaRef, it will delete the contents of the area.
     * If multiple cells are part of the copied area, it will delete onto multiple cells.
     * @param areaRef
     * @constructor
     */
    function DeleteArea(areaRef:string) {
        const range = JSON.parse(areaRef);
        for (const cellInfo of ReadArea(range.startRow, range.endRow, range.startCol, range.endCol)) {
            WorkbookManager.getActiveSheet()?.RemoveCell(cellInfo.col, cellInfo.row);
        }
        EvalCellsInViewport(columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20);
    }
    
// Allows us to navigate the cells using the arrow and Enter keys
    const keyNav = (event:any): void => {
        let nextRow = rowIndex;
        let nextCol = columnIndex;
        let areaRef

        /** Special case for Backspace and Delete keys. Required because the backspace key is used to delete cell contents and needs to be overwritten differently*/
        if (AreaMarked && (event.key === "Backspace" || event.key === "Delete")) {
            setHighlight(selectionStartCell!, true);
            areaRef = sessionStorage.getItem('selectionRange')!;

            DeleteArea(areaRef);

            clearVisualHighlight()
            AreaMarked = false
        }

        if(event.ctrlKey) {
            switch (event.key) {
                // Undo functionality:
                case "z":
                    event.preventDefault()

                    WorkbookManager.getActiveSheet()?.undo()

                    EvalCellsInViewport(columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20);
                    break

                // Redo functionality:
                case "y":
                    event.preventDefault()

                    WorkbookManager.getActiveSheet()?.redo()

                    EvalCellsInViewport(columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20);
                    break

                case "c":
                    event.preventDefault();
                    if (AreaMarked) {
                        sessionStorage.removeItem("tmpCellRef");
                        setHighlight(selectionStartCell!, true);
                    } else {
                        setHighlight(ID, true);
                    }
                    break
                case "x":
                    event.preventDefault();
                    areaRef = sessionStorage.getItem('selectionRange');
                    if (areaRef) {
                        CutArea(areaRef);
                    }
                    sessionStorage.removeItem('selectionRange');
                    break
                case "v":
                    event.preventDefault();
                    areaRef = sessionStorage.getItem('selectionRange');
                    if(areaRef) {
                        PasteArea(areaRef);
                    }
                    break
                case "b":
                    makeBold();
                    break
                case "i":
                    makeItalic();
                    break
                case "u":
                    makeUnderlined();
                    break;
            }
        }


        switch (event.key) {
            case "ArrowUp":
                nextRow = Math.max(0, rowIndex - 1);
                if (isShiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false
                }
                break;

            case "ArrowDown":
                nextRow = rowIndex + 1;
                if (isShiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false

                }
                break;

            case "ArrowLeft":
                nextCol = Math.max(0, columnIndex - 1);
                if (isShiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false

                }
                break;

            case "ArrowRight":
                nextCol = columnIndex + 1;
                if (isShiftKeyDown) {
                    setHighlight(selectionStartCell!, false, nextCol, nextRow);
                    AreaMarked = true;
                } else {
                    clearVisualHighlight();
                    AreaMarked = false

                }
                break;

            case "Enter":
                nextRow = rowIndex + 1;
                break;
            case "Shift":
                selectionStartCell = WorkbookManager.getActiveCell();
                isShiftKeyDown = true;
                break;
            default:
                return;
        }


        // After an arrow key is pressed, gets the next cell's ID and then the cell itself by the ID
        // so we can focus the cell. Also updates the cell ID displayed to show the current cell's ID.
        const nextCellID = numberToLetters(nextCol + 1) + (nextRow + 1);
        const nextCell = document.getElementById(nextCellID);
        const cellIdInput = document.getElementById("cellIdInput") as HTMLInputElement;

        if (nextCell && cellIdInput) {
            nextCell.focus();
            cellIdInput.value = nextCellID;
            event.preventDefault(); // Prevents scrolling until edges are reached
        }
    }

    /**
     * Processes input into a specific cell location using its content, row, and column
     * @param rowIndex
     * @param columnIndex
     * @param content
     */
    const handleInput = (rowIndex:number, columnIndex:number, content:string) => {
        if (!HandleArrayFormula(columnIndex,rowIndex)) {return}
        if (!ParseCellToBackend(content,columnIndex,rowIndex)) {return}
        if (!HandleArrayResult(columnIndex,rowIndex)) {return}
    }

    /**
     * Updates the header FormulaBox with the values from within the active cell
     * @param cellID
     * @param content
     */
    const updateFormulaBox = (cellID:string, content:string|null):void => {
        const formulaBox = document.getElementById("formulaBox");
        if (!formulaBox) {
            console.debug("[SpreadsheetGrid.tsx Cell] FormulaBox not found");
            return;
        }
        console.log("this is the content for the formulabox:", content as string);
        (formulaBox as HTMLInputElement).value = content as string;
    }

    /**
     * Highlights an area. If saveHighlight = true, it is saved as session storage
     * @param endCell
     * @param saveHighlight
     * @param arrowOptCol
     * @param arrowOptRow
     */
    function setHighlight(endCell:string, saveHighlight:boolean = false,  arrowOptCol?:number, arrowOptRow?:number): void {
        const endCellRef = new A1RefCellAddress(endCell);
        let currentActiveCellRef;
        if(arrowOptCol && arrowOptRow) {
            currentActiveCellRef = new A1RefCellAddress(numberToLetters(arrowOptCol + 1) + (arrowOptRow + 1))
        } else {
            currentActiveCellRef = new A1RefCellAddress(ID);
        }
        let {ulCa,lrCa} = A1RefCellAddress.normalizeArea(currentActiveCellRef,endCellRef)

        clearVisualHighlight()

        // Highlight all cells in the range
        for (let r = ulCa.row; r <= lrCa.row; r++) {
            for (let c = ulCa.col; c <= lrCa.col; c++) {
                const cellID = numberToLetters(c + 1) + (r + 1);
                const cell = document.getElementById(cellID);
                if (cell) {
                    cell.classList.add('selected-cell');
                }
            }
        }
        if(saveHighlight) {
            sessionStorage.setItem('selectionRange', JSON.stringify({
                startCol : ulCa.col,
                startRow : ulCa.row,
                endCol : lrCa.col,
                endRow : lrCa.row
            }));
        }
    }
    return (
        <div className="Cell" contentEditable={true} id={ID} title={ID}
             style={{
                 ...style, // Inherit style from style.css
                 background: rowIndex % 2 === 0 ? "lightgrey" : "white", // Gives 'striped' look to grid body
             }}

             onClick={(e) => {
                 if(e.shiftKey && selectionStartCell) {
                     setHighlight(selectionStartCell);
                     AreaMarked = true

                 } else {
                     clearVisualHighlight()
                 }
             }}

             onFocus={(e) => {
                 //All of this is to add and remove styling from the active cell
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
                 let rawCellContent:string | null = GetRawCellContent(ID);
                 WorkbookManager.setActiveCell(ID);
                 if (!rawCellContent) {
                     console.debug("[SpreadsheetGrid.tsx Cell] Cell Content not updated");
                     updateFormulaBox(ID, rawCellContent);
                     return;
                 }
                 rawCellContent = rawCellContent.trim();
                 setValueHolder((e.target as HTMLElement).innerText.trim());
                 initialValueRef.current = rawCellContent; //should not be innerText, but actual content from backEnd
                 (e.target as HTMLInputElement).innerText = rawCellContent;
                 console.log("this is the rawCellContent", rawCellContent)
                 updateFormulaBox(ID, rawCellContent);

                 setMySupports(GetSupportsInViewPort(columnIndex,rowIndex)!)

                 if (!mySupports) {
                     return;
                 }
                 for (let i = 0; i < mySupports.length; i++){
                     let supportingCell = document.getElementById(mySupports[i]);
                     if (supportingCell) {
                         supportingCell.classList.add("support-cell");
                     }
                 }
             }}
             onMouseDown={displayCellId} // Gets the cellID when moving the mouse
             onKeyDown={(e) => {
                 keyNav(e);
             }}
             onBlur={(e) => {

                 console.debug("Values not found:" ,WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.Get(columnIndex,rowIndex))

                 console.log(WorkbookManager.getWorkbook()?.getSheet(WorkbookManager.getActiveSheetName())?.Get(columnIndex,rowIndex))
                 //Only update cell if the contents have changed!
                 const newValue = (e.target as HTMLElement).innerText;
                 if (newValue !== initialValueRef.current) {
                     handleInput(rowIndex, columnIndex, newValue);
                     EvalCellsInViewport(columnIndex+1,columnIndex+3,rowIndex+1,rowIndex+3);
                     console.debug("Cell Updated");
                 }
                 else {(e.target as HTMLElement).innerText = valueHolder}
                 if (mySupports) {
                     for (let i = 0; i < mySupports.length; i++){
                         let supportingCell = document.getElementById(mySupports[i]);
                         if (supportingCell) {
                             supportingCell.classList.remove("support-cell");
                         }
                     }
                 }
                 EvalCellsInViewport(columnIndex-20,columnIndex+20,rowIndex-20,rowIndex+20);
             }}

             onInput={(e) => {
                 //Update formula box alongside cell input, also show caret (text cursor) once writing starts
                 updateFormulaBox(ID, (e.target as HTMLElement).innerText);
                 e.currentTarget.classList.remove("hide-caret");
                 e.currentTarget.classList.add("show-caret");
             }}
        >
        </div>
    );
};
