import React, { useEffect, useRef, useState } from "react";
import { VariableSizeGrid as Grid } from "react-window";
import {
    GetRawCellContent,
    GetSupportsInWindow,
    ParseToActiveCell,
    ShowWindowInGUI,
    WorkbookManager,
    XMLReader
} from "../WorkbookIO";
import {
    getCell,
    adjustFormula,
    numberToLetters,
    lettersToNumber,
    formulaBox,
    makeBold,
    makeItalic,
    makeUnderlined,
    setCellColor,
    setTextColor
} from "./HelperFunctions.tsx";
import {Cell as BackendCell, Formula} from "../back-end/Cells";
import {Sheet} from "../back-end/Sheet.ts";
import {A1RefCellAddress, SuperCellAddress} from "../back-end/CellAddressing.ts";
import {ArrayExplicit} from "../back-end/ArrayValue.ts";

// Created interface so that we can modify columnCount and rowCount when creating the grid
interface GridInterface {
    columnCount: number;
    rowCount: number;
    columnWidth?: number;
    rowHeight?: number;
    colHeaderHeight?: number;
    rowHeaderWidth?: number;
    width?: number;
    height?: number;
    ref?: React.Ref<any>;
}

/** Defines the column headers as a div with ID, style, and contents
 *
 * @param columnIndex - Current column index shown in the header as a corresponding letter, as defined in the numberToLetters function
 * @param style - Lets the header inherit style from a css style sheet
 * @constructor
 */
const ColumnHeader = ({ columnIndex, style }: {columnIndex:number, style:any}) => (
    <div id="columnHeaders"
         style={{
             ...style, // Inherit style from style.css
         }}
    >
        {numberToLetters(columnIndex + 1)}
    </div>
);

/** Defines the row headers as a div with ID, style, and contents
 *
 * @param rowIndex - Current row index shown in the header
 * @param style - Lets the header inherit style from a css style sheet
 * @constructor
 */
const RowHeader = ({ rowIndex, style }: {rowIndex:number, style:any}) => (
    <div id="rowHeaders"
         style={{
             ...style, // Inherit style from style.css
         }}
    >
        {rowIndex + 1} {/* +1 since its 0-indexed */}
    </div>
);

/** Defines the regular cell along with an ID in A1 format. It also passes on its ID when hovered over.
 * @param columnIndex - Current column index, used to define cell ID
 * @param rowIndex - Current row index, used to define cell ID and determine cell background color
 * @param style - Lets the cell inherit the style from a css style sheet
 * @constructor
 */
const Cell = ({ columnIndex, rowIndex, style }:{columnIndex:number, rowIndex: number, style:any}) => {
    const ID = numberToLetters(columnIndex + 1) + (rowIndex + 1); // +1 to offset 0-index
    let isActive = ID == WorkbookManager.getActiveCell();
    let initialValueRef = useRef<string>("");
    let valueHolder:string = "";
    let mySupports:string[];

    // Passes the cell ID to the headerCorner as textContent of the headerCorner
    const handleHover = () => {
        const headerCorner = document.getElementById("headerCorner");
        if(headerCorner) { // if-statement handles possibility that headerCorner is null
            headerCorner.textContent = ID;
        }
    }

    const clearHighlight = () => {
        const previousSelection = document.querySelectorAll('.selected-cell');
        previousSelection.forEach(cell => {
            cell.classList.remove('selected-cell');
        });
        sessionStorage.removeItem('selectionRange');
    }

    // Allows us to navigate the cells using the arrow and Enter keys
    const keyNav = (event:any): void => {
        let nextRow = rowIndex;
        let nextCol = columnIndex;

        if(event.ctrlKey) {
            switch (event.key) {
                case "c":
                    event.preventDefault();
                    const tmpRef = new A1RefCellAddress(ID)
                    sessionStorage.setItem('tmpCellRef', JSON.stringify({
                        ID: ID,
                        col: tmpRef.col,
                        row: tmpRef.row
                    }));
                    break
                case "x":
                    event.preventDefault();
                    const storedRef = sessionStorage.getItem('tmpCellRef');
                    if (storedRef) {
                        const parsedRef = JSON.parse(storedRef);

                        WorkbookManager.getActiveSheet()?.MoveCell(parsedRef.col,parsedRef.row, columnIndex, rowIndex);

                        document.getElementById(parsedRef.ID)!.innerText = ""
                        ShowWindowInGUI(WorkbookManager.getActiveSheetName(), columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20, false);
                    }
                    break
                case "v":
                    event.preventDefault();
                    const storedRef2 = sessionStorage.getItem('tmpCellRef');
                    if (storedRef2) {
                        const parsedRef = JSON.parse(storedRef2);
                        const tmpCell = WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())?.Get(parsedRef.col, parsedRef.row)!
                        WorkbookManager.getActiveSheet()?.MoveCell(parsedRef.col, parsedRef.row, columnIndex, rowIndex);
                        WorkbookManager.getActiveSheet()?.SetCell(tmpCell, parsedRef.col, parsedRef.row)
                        ShowWindowInGUI(WorkbookManager.getActiveSheetName(), columnIndex - 20, columnIndex + 20, rowIndex - 20, rowIndex + 20, false);
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
                nextRow = Math.max(0, rowIndex - 1); //Needed to not go too far up
                break;
            case "ArrowDown":
                nextRow = rowIndex + 1;
                break;
            case "ArrowLeft":
                nextCol = Math.max(0, columnIndex - 1); //Needed to not go too far left
                break;
            case "ArrowRight":
                nextCol = columnIndex + 1;
                break;
            case "Enter":
                nextRow = rowIndex + 1;
                break;
            case "F4":
                event.preventDefault();
                // Check what cell we are in.
                const StartCell = document.getElementById("headerCorner");
                if (StartCell) {
                    const StartCellRef = new A1RefCellAddress(StartCell.textContent!);

                    const sourceIDContent = GetRawCellContent(ID)
                    // Define the area, we will be using.
                    // Maybe this could be a method?
                    const startCol = Math.min(columnIndex, StartCellRef.col);
                    const endCol = Math.max(columnIndex, StartCellRef.col);
                    const startRow = Math.min(rowIndex, StartCellRef.row);
                    const endRow = Math.max(rowIndex, StartCellRef.row);

                    // Clear any existing highlight, if there were any.
                    clearHighlight()

                    for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                            if (r === startRow && c === startCol) continue;
                            const cellID = numberToLetters(c + 1) + (r + 1); // +1 because we are 1-indexed in the UI.
                            const cell = document.getElementById(cellID);
                            if (cell) {
                                cell.classList.add('selected-cell');
                            }
                        }
                    }
                    // Save the values in session storage, so it can be accessed between calls.
                    sessionStorage.setItem('selectionRange', JSON.stringify({
                        sourceIDContent,
                        startCol,
                        startRow,
                        endCol,
                        endRow
                    }));
                }
                break;
            case "F5":
                event.preventDefault();
                const selectionRange = sessionStorage.getItem('selectionRange');
                if (selectionRange) {
                    const range = JSON.parse(selectionRange);
                    const { startCol, startRow, endCol, endRow, sourceIDContent } = range;

                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {

                                if (r === startRow && c === startCol) continue;

                                const newForm = adjustFormula(sourceIDContent!.toString(),r - startRow, c - startCol)

                                handleInput(r,c,newForm)


                                const targetCellID = numberToLetters(c + 1) + (r + 1);
                                const cellElement:HTMLElement = document.getElementById(targetCellID)!;
                                cellElement.innerText = newForm;
                            }
                    }

                }
                WorkbookManager.getWorkbook().Recalculate();
                sessionStorage.removeItem('selectionRange');


                break;
            default:
                return;
        }

        // After an arrow key is pressed, gets the next cell's ID and then the cell itself by the ID
        // so we can focus the cell. Also updates top-left corner to show current cell's ID.
        const nextCellID = numberToLetters(nextCol + 1) + (nextRow + 1);
        const nextCell = document.getElementById(nextCellID);
        const headerCorner = document.getElementById("headerCorner");

        if (nextCell && headerCorner) {
            nextCell.focus();
            headerCorner.textContent = nextCellID;
            event.preventDefault(); // Prevents scrolling until edges are reached
        }
    }

    const handleInput = (rowIndex:number, columnIndex:number, content:string) => {
        const cellToBeAdded:BackendCell|null = BackendCell.Parse(content,WorkbookManager.getWorkbook(),columnIndex,rowIndex);
        console.log(cellToBeAdded);
        if (!cellToBeAdded) {return}
        WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())?.SetCell(cellToBeAdded, columnIndex, rowIndex);

        //Handle Array Results for different cells.
        WorkbookManager.getWorkbook().Recalculate();

        //Handle Array Results for different cells.
        const cell = WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())?.Get(columnIndex, rowIndex);
        if (!cell) return; // Check that cell is not null
        const result = cell.Eval(WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())!, columnIndex, rowIndex);

        if (cell instanceof Formula && result instanceof ArrayExplicit) {
            WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())?.SetArrayFormula(
                cell, // cell
                columnIndex,
                rowIndex,
                new SuperCellAddress(columnIndex, rowIndex),
                new SuperCellAddress(columnIndex, rowIndex + result!.values[0].length - 1)
            )
        }
    }

    const updateFormulaBox = (cellID:string, content:string|null):void => {
        const formulaBox = document.getElementById("formulaBox");
        if (!formulaBox) {
            console.debug("[SpreadsheetGrid.tsx Cell] FormulaBox not found");
            return;
        }
        (formulaBox as HTMLInputElement).value = content as string;
    }

    return (
        <div className="Cell" contentEditable={true} id={ID}
             style={{
                 ...style, // Inherit style from style.css
                 background: rowIndex % 2 === 0 ? "lightgrey" : "white", // Gives 'striped' look to grid body
             }}

             onClick={(e) => {
                 clearHighlight()
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
                 valueHolder = (e.target as HTMLElement).innerText;
                 initialValueRef.current = rawCellContent; //should not be innerText, but actual content from backEnd
                 (e.target as HTMLInputElement).innerText = rawCellContent;

                 //Also write the content in the formula box at the top
                 updateFormulaBox(ID, rawCellContent);

                 mySupports = GetSupportsInWindow(columnIndex-20, columnIndex+20,rowIndex-20,rowIndex+20,columnIndex+1,rowIndex+1);
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
             onMouseMove={handleHover} // Gets the cellID when moving the mouse
             onKeyDown={(e) => {
                 keyNav(e);
             }}
             onBlur={(e) => {

                 console.debug("Value not found:" ,WorkbookManager.getWorkbook()?.get(WorkbookManager.getActiveSheetName())?.Get(columnIndex,rowIndex))
                 //Only update cell if the contents have changed!
                 const newValue = (e.target as HTMLElement).innerText;
                 if (newValue !== initialValueRef.current) {
                     handleInput(rowIndex, columnIndex, newValue);
                     ShowWindowInGUI(WorkbookManager.getActiveSheetName(),columnIndex+1,columnIndex+3,rowIndex+1,rowIndex+3, false);
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
                 ShowWindowInGUI(WorkbookManager.getActiveSheetName(),columnIndex-20,columnIndex+20,rowIndex-20,rowIndex+20, false);
                 //console.log(GetSupportsInWindow(columnIndex-20, columnIndex+20,rowIndex-20,rowIndex+20,columnIndex+1,rowIndex+1));
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

// @ts-ignore
const SheetSelector = ({ sheetNames, activeSheet, setActiveSheet, setSheetNames, scrollOffset }) => {
    return (
        <footer style={{ display: 'flex', gap: '1px'}}>
            {sheetNames.map((name:any) => (
                <button
                    key={name}
                    onClick={() => {setActiveSheet(name); WorkbookManager.setActiveSheet(name); ShowWindowInGUI(name, scrollOffset.left, scrollOffset.left+30, scrollOffset.top, scrollOffset.top+30, true)}}
                    style={{
                        backgroundColor: activeSheet === name ? 'darkslategrey' : '',
                        color: activeSheet === name ? '' : '',
                        fontWeight: activeSheet === name ? '' : 'normal',
                        borderBottom: activeSheet === name ? '3px solid #4a7e76' : '',
                        borderRadius: activeSheet === name ? '0' : '',
                        height: activeSheet === name ? '22px' : ''
                    }}
                >
                    {name}
                </button>
            ))}
            <button id="createSheetButton"
                onClick={() => {
                    const newSheetName = window.prompt("Enter an unused Sheet Name");
                    if (newSheetName && !sheetNames.includes(newSheetName) && newSheetName.trim() !== "") {
                        let newSheet = new Sheet(WorkbookManager.getWorkbook(), newSheetName, 65536, 1048576, false);
                        WorkbookManager.getWorkbook().AddSheet(newSheet);
                        setSheetNames([...sheetNames, newSheetName]);
                    }
                }}
            >
                +
            </button>
        </footer>
    );
};

/** Creates the sheet itself with headers and body. It extends the GridInterface so that
 * we can create a sheet with a self-defined amount of rows and columns.
 * The sheet itself consists of a top row flexbox with a corner cell and a row of column
 * headers created as a Grid. The main body itself is also a flexbox, consisting of two
 * additional grids; one for the row headers and one for the regular cells.
 */
export const SpreadsheetGrid: React.FC<GridInterface> = (({
     columnCount,
     rowCount,
     columnWidth = 80,
     rowHeight = 30,
     colHeaderHeight = 40,
     rowHeaderWidth = 40,
     width = window.innerWidth,
     height = window.innerHeight * 0.92,
 }) => {
    // Used to synchronize scrolling between the referenced objects
    const colHeaderRef = useRef<Grid>(null);
    const rowHeaderRef = useRef<Grid>(null);
    const bodyRef = useRef<Grid>(null);
    let [scrollOffset] = useState({left: 0, top: 0});
    let [sheetNames, setSheetNames] = useState<string[]>(["Sheet1"]);
    let [activeSheet, setActiveSheet] = useState(sheetNames[0]);

    useEffect(() => {
        const jumpButton = document.getElementById("jumpToCell") as HTMLButtonElement;
        const input = document.getElementById("jumpToInput") as HTMLInputElement;
        const boldButton = document.getElementById("bold") as HTMLButtonElement;
        const italicButton = document.getElementById("italic") as HTMLButtonElement;
        const underlineButton = document.getElementById("underline") as HTMLButtonElement;
        const cellColor = document.getElementById("cellColorPicker") as HTMLInputElement;
        const textColor = document.getElementById("textColorPicker") as HTMLInputElement;
        if (!jumpButton || !input) return; // In case either element doesn't exist/is null

        // Handle file drop events entirely in React
        function handleDrop(event: DragEvent) {
            event.preventDefault();
            const file = event.dataTransfer?.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const content = e.target?.result as string;
                    WorkbookManager.createNewWorkbook(); // or call createNewWorkbook()
                    const xmlReader = new XMLReader();

                    try {
                        await xmlReader.readFile(content); // Assumes it modifies the current workbook

                        console.debug("[React Drop Handler] File loaded. Updating UI...");
                        sheetNames = WorkbookManager.getSheetNames();
                        setSheetNames(sheetNames);
                        setActiveSheet(sheetNames[0]);
                        WorkbookManager.setActiveSheet(sheetNames[0]);
                        ShowWindowInGUI(activeSheet, scrollOffset.left, scrollOffset.left + 30, scrollOffset.top, scrollOffset.top + 30, false);
                    } catch (error) {
                        console.error("Error during load:", error);
                    }
                };
                reader.readAsText(file);
            }
        }

        function handleDragOver(event: DragEvent) {
            event.preventDefault();
        }

        // Handles the "Go to"/jump to a specific cell. Currently, bugged when trying to focus a cell off-screen
        // and must trigger twice to do so.

        const handleJump = () => {
            const cellID = input.value.trim();
            const headerCorner = document.getElementById("headerCorner");

            if (cellID) {
                const idSplit = cellID.match(/[A-Za-z]+|\d+/g) || [];

                if (idSplit.length === 2) {
                    const col = lettersToNumber(idSplit[0]);
                    const row = parseInt(idSplit[1], 10);

                    if (bodyRef.current) {
                        bodyRef.current.scrollToItem({
                            align: "smart",
                            columnIndex: col,
                            rowIndex: row
                        });


                        // Delay in case the item needs to be rendered first
                        setTimeout(() => {
                            const targetCell = getCell(cellID);
                            if (targetCell && headerCorner) {
                                targetCell.focus();
                                headerCorner.textContent = cellID;
                            }
                        }, 50);
                    }
                }
            }
        }

        window.addEventListener("drop", handleDrop); // Drag and drop
        window.addEventListener("dragover", handleDragOver); // Drag and drop
        jumpButton.addEventListener("click", handleJump); // Jump to cell
        input.addEventListener("keydown", (e) => { // Jump to cell
            if (e.key === "Enter") handleJump();
        })

        boldButton.addEventListener("click", makeBold)
        italicButton.addEventListener("click", makeItalic)
        underlineButton.addEventListener("click", makeUnderlined)

        cellColor.addEventListener("input", setCellColor);
        textColor.addEventListener("input", setTextColor);


        return () => {
            window.removeEventListener("drop", handleDrop); // Drag and drop
            window.removeEventListener("dragover", handleDragOver); // Drag and drop
            jumpButton.removeEventListener("click", handleJump); // Jump to cell
            boldButton.removeEventListener("click", makeBold)
            italicButton.removeEventListener("click", makeItalic)
            underlineButton.removeEventListener("click", makeUnderlined)
        };
    }, [scrollOffset]);

    //Handling the formulabox input
    useEffect(() => {
        const formulaBox = document.getElementById("formulaBox") as HTMLInputElement;
        if (!formulaBox) return;

        let value: string;
        let valueChanged: boolean = false;

        const handleFormulaChange = (e: Event) => {
            value = (e.target as HTMLInputElement).value;
            valueChanged = true;
            let activeCell = document.getElementById(WorkbookManager.getActiveCell()!);
            if (activeCell) {
                activeCell.innerHTML = value;
            }
            //console.log("Formula changed:", value);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                if (valueChanged) {
                    updateCellContents();
                }
            }
        }

        const handleBlur = () => {
            if (valueChanged) {
                updateCellContents();
            }
        }

        const updateCellContents = () => {
            valueChanged = false;
            ParseToActiveCell(value);
            ShowWindowInGUI(WorkbookManager.getActiveSheetName(), scrollOffset.left, scrollOffset.left + 30, scrollOffset.top, scrollOffset.top + 30, false);
        }

        formulaBox.addEventListener("keydown", handleKeyDown);
        formulaBox.addEventListener("blur", handleBlur);
        formulaBox.addEventListener("input", handleFormulaChange);

        return () => {
            formulaBox.removeEventListener("input", handleFormulaChange);
            formulaBox.removeEventListener("keydown", handleKeyDown);
            formulaBox.removeEventListener("blur", handleBlur);
        };
    }, []);

    /** Synchronizes scrolling between the grid body and the headers so that it works
     * like one, big grid. Does not currently synchronize scrolling done on the headers.
     *
     * @param scrollLeft Horizontal scrolling value
     * @param scrollTop Vertical scrolling value
     */
    const syncScroll = ({scrollLeft, scrollTop}: {scrollLeft:any; scrollTop:any}) => {
        if (scrollLeft !== undefined) {
            if (colHeaderRef.current) {
                colHeaderRef.current.scrollTo({scrollLeft});
            }
        }
        if (scrollTop !== undefined) {
            if (rowHeaderRef.current) {
                rowHeaderRef.current.scrollTo({scrollTop});
            }
        }
        scrollOffset = { left: scrollLeft, top: scrollTop };
    }

    return (
        // Container that wraps around all parts of the sheet
        <div id="sheet">
            <SheetSelector
                sheetNames={sheetNames}
                activeSheet={activeSheet}
                setActiveSheet={setActiveSheet}
                setSheetNames={setSheetNames}
                scrollOffset = {scrollOffset}
            />
            {/* Header row as a 1-row grid */}
            <div style={{ display: "flex" }}>
                {/* Top-left corner */}
                <div id="headerCorner"
                     style={{ // Has to be defined here to use dimensions of the sheet
                         width: rowHeaderWidth-1,
                         height: colHeaderHeight,
                     }}
                >
                    {"#"}
                </div>
                {/* Column headers as a grid */}
                <Grid
                    columnCount={columnCount}
                    columnWidth={() => columnWidth}
                    height={colHeaderHeight}
                    rowCount={1}
                    rowHeight={() => colHeaderHeight}
                    width={width - rowHeaderWidth}
                    overscanColumnCount={10}
                    ref={colHeaderRef}
                >
                    {ColumnHeader}
                </Grid>
            </div>

            {/* Remaining grid */}
            <div style={{ display: "flex" }}>
                {/* Row headers */}
                <Grid
                    columnCount={1}
                    columnWidth={() => rowHeaderWidth}
                    height={height - colHeaderHeight}
                    rowCount={rowCount}
                    rowHeight={() => rowHeight}
                    width={rowHeaderWidth}
                    overscanRowCount={10}
                    ref={rowHeaderRef}
                >
                    {RowHeader}
                </Grid>

                {/* Grid body */}
                <div id="gridBody">
                    <Grid
                        columnCount={columnCount}
                        columnWidth={() => columnWidth}
                        height={height - colHeaderHeight}
                        rowCount={rowCount}
                        rowHeight={() => rowHeight}
                        width={width - rowHeaderWidth}
                        overscanColumnCount={10}
                        overscanRowCount={10}
                        ref={bodyRef}
                        onScroll={syncScroll}
                        onItemsRendered={({
                                              visibleRowStartIndex,
                                              visibleRowStopIndex,
                                              visibleColumnStartIndex,
                                              visibleColumnStopIndex,
                                          }) => {
                            ShowWindowInGUI(
                                activeSheet,
                                visibleColumnStartIndex,
                                visibleColumnStopIndex + 1, // +1 because the stop index is inclusive
                                visibleRowStartIndex,
                                visibleRowStopIndex + 1,
                                false
                            );
                        }}
                    >
                        {Cell}
                    </Grid>
                </div>
            </div>
        </div>
    );
});
