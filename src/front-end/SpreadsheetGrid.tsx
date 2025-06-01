import React, { useEffect, useRef, useState } from "react";
import { VariableSizeGrid as Grid } from "react-window";
import { XMLWriter, XMLReader } from "../API-Layer/WorkbookIO.ts";
import { WorkbookManager } from "../API-Layer/WorkbookManager.ts";
import {
    EvalCellsInViewport,
    ParseCellToBackend,
    ParseToActiveCell,
} from "../API-Layer/Back-endEndpoints.ts";
import {
    getCell,
    numberToLetters,
    lettersToNumber,
} from "./HelperFunctions.tsx";
import { GridCell } from "./GridCell.tsx";
import { SheetFooter } from "./SheetFooter.tsx";
import { SheetHeader } from "./SheetHeader.tsx";
import { NumberCell } from "../back-end/Cells.ts";

/**
 * Defines the props for the VirtualizedGrid component.
 * @param columnCount - number of columns, received as a parameter when rendering VirtualizedGrid
 * @param rowCount - number of rows, received as a parameter when rendering VirtualizedGrid
 * @param columnWidth - width of the columns and all regular cells
 * @param rowHeight - height of the rows and all regular cells
 * @param colHeaderHeight - custom height for the column header
 * @param rowHeaderWidth - custom width for the row header
 * @param width - overall width of the entire grid
 * @param height - overall height of the entire grid
 * @param ref - React ref to the grid, used to access the grid's methods'
 * @constructor
 */
interface GridProps {
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

/**
 * Defines the column headers as a div with ID, style, and contents
 * @param columnIndex - Current column index shown in the header as a corresponding letter, as defined in the numberToLetters function
 * @param style - Lets the header inherit style from a css style sheet
 * @constructor
 */
const ColumnHeader = ({
    columnIndex,
    style,
}: {
    columnIndex: number;
    style: any;
}) => (
    <div
        id="columnHeaders"
        style={{
            ...style, // Inherit style from style.css
        }}
    >
        {numberToLetters(columnIndex + 1)}
    </div>
);

/**
 * Defines the row headers as a div with ID, style, and contents
 * @param rowIndex - Current row index shown in the header
 * @param style - Lets the header inherit style from a css style sheet
 * @constructor
 */
const RowHeader = ({ rowIndex, style }: { rowIndex: number; style: any }) => (
    <div
        id="rowHeaders"
        style={{
            ...style, // Inherit style from style.css
        }}
    >
        {rowIndex + 1} {/* +1 since its 0-indexed */}
    </div>
);

/**
 * Creates the sheet itself with headers and body. The sheet itself consists of a top row flexbox
 * with a corner cell and a row of column headers created as a Grid. The main body itself is also
 * a flexbox, consisting of two additional grids; one for the row headers and one for the regular cells.
 * @param columnCount - number of columns, received as a parameter when rendering VirtualizedGrid
 * @param rowCount - number of rows, received as a parameter when rendering VirtualizedGrid
 * @param columnWidth - width of the columns and all regular cells
 * @param rowHeight - height of the rows and all regular cells
 * @param colHeaderHeight - custom height for the column header
 * @param rowHeaderWidth - custom width for the row header
 * @param width - overall width of the entire grid
 * @param height - overall height of the entire grid
 * @constructor
 */
export const VirtualizedGrid: React.FC<GridProps> = ({
    columnCount,
    rowCount,
    columnWidth = 80,
    rowHeight = 30,
    colHeaderHeight = 40,
    rowHeaderWidth = 40,
    width = window.innerWidth,
    height = window.innerHeight * 0.92,
}: GridProps) => {
    const colHeaderRef = useRef<Grid>(null);
    const rowHeaderRef = useRef<Grid>(null);
    const bodyRef = useRef<Grid>(null);
    const [scrollOffset, setScrollOffset] = useState({ left: 0, top: 0 });
    const [sheetNames, setSheetNames] = useState<string[]>(["Sheet1"]);
    const [activeSheet, setActiveSheet] = useState(sheetNames[0]);
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const formulaBox = document.getElementById(
            "formulaBox",
        ) as HTMLInputElement;
        const input = document.getElementById(
            "cellIdInput",
        ) as HTMLInputElement;
        const jumpButton = document.getElementById(
            "jumpToCell",
        ) as HTMLButtonElement;

        addEventListener("resize", () => {
            setWindowDimensions({
                width: window.innerWidth * 0.92,
                height: window.innerHeight * 0.92,
            });
        });

        /**
         * Handles the "Go to"/jump to a specific cell. First checks if the cell ID input is not empty,
         * and, if so, checks if the cell ID is valid. If both cases pass, it scrolls to and focuses on
         * the specified cell.
         */
        const handleJump = () => {
            const cellID = input.value.trim();

            if (cellID) {
                const idSplit = cellID.match(/[A-Za-z]+|\d+/g) || [];

                if (idSplit.length === 2) {
                    const col = lettersToNumber(idSplit[0]);
                    const row = parseInt(idSplit[1], 10);

                    if (bodyRef.current) {
                        bodyRef.current.scrollToItem({
                            align: "smart",
                            columnIndex: col,
                            rowIndex: row,
                        });
                        setTimeout(() => {
                            // Delay to ensure the cell renders first
                            const targetCell = getCell(cellID);
                            if (targetCell) {
                                targetCell.focus();
                            }
                        }, 50);
                    }
                }
            }
        };

        let value: string;
        let valueChanged: boolean = false;
        /**
         * Passes changes made in the formula box to the HTML element of the active cell
         * @param e
         */
        const handleFormulaChange = (e: Event) => {
            value = (e.target as HTMLInputElement).value;
            valueChanged = true;
            let activeCell = document.getElementById(
                WorkbookManager.getActiveCell()!,
            );
            if (activeCell) {
                activeCell.innerText = value;
            }
        };

        /**
         * If the Enter key is pressed and the active cell's value has been changed,
         * Handles the keyboard "keydown" event, specifically for the "Enter" key. If so,
         * it updates cell contents.
         * @param e - Checks for keyboard events, specifically the Enter key
         */
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                if (valueChanged) {
                    updateCellContents();
                }
            }
        };

        /**
         * Identical to handleKeyDown(), but instead triggers when leaving a cell.
         */
        const handleBlur = () => {
            if (valueChanged) {
                const activeId = WorkbookManager.getActiveCell();
                const activeCell = document.getElementById(activeId!);
                const valueHolder = (
                    document.getElementById("formulaBox") as HTMLInputElement
                ).value;
                console.log(
                    "formulaBox",
                    document.getElementById("formulaBox")!.innerHTML,
                );
                console.log("innertext: ", activeCell!.innerHTML);
                activeCell!.focus();
                activeCell!.innerHTML = valueHolder;
                const enterEvent = new KeyboardEvent("keydown", {
                    key: "Enter",
                    code: "Enter",
                    bubbles: true,
                });
                activeCell?.dispatchEvent(enterEvent);
                valueChanged = false;
            }
        };

        /**
         * Performs the actual updating of the currently active cell's contents. It first
         * resets the valueChanged flag before parsing the provided value. Lastly, all
         * cells in the current viewport are evaluated.
         */
        const updateCellContents = () => {
            let fmb = document.getElementById("formulaBox");
            fmb!.blur();
        };

        /**
         * Handles the drag-and-drop of an XMLSS file to be read and loaded in TypeCalc.
         * @param event - a DragEvent
         */
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
                        setSheetNames(WorkbookManager.getSheetNames());
                        setActiveSheet(sheetNames[0]);
                        WorkbookManager.setActiveSheet(sheetNames[0]);
                        EvalCellsInViewport();
                    } catch (error) {
                        console.error("Error during load:", error);
                    }
                };
                reader.readAsText(file);
            }
        }

        /**
         * Prevents default browser behaviour from occurring when dragging in a file
         * @param event
         */
        function handleDragOver(event: DragEvent) {
            event.preventDefault();
        }

        // Event listener management
        //--------------------------------------
        window.addEventListener("drop", handleDrop); // Drag and drop
        window.addEventListener("dragover", handleDragOver); // Drag and drop
        formulaBox.addEventListener("keydown", handleKeyDown);
        formulaBox.addEventListener("blur", handleBlur);
        formulaBox.addEventListener("input", handleFormulaChange);
        jumpButton.addEventListener("click", handleJump); // Jump to cell
        input.addEventListener("keydown", (e) => {
            // Jump to cell
            if (e.key === "Enter") handleJump();
        });

        return () => {
            window.removeEventListener("drop", handleDrop); // Drag and drop
            window.removeEventListener("dragover", handleDragOver); // Drag and drop
            formulaBox.removeEventListener("input", handleFormulaChange);
            formulaBox.removeEventListener("keydown", handleKeyDown);
            formulaBox.removeEventListener("blur", handleBlur);

            jumpButton.removeEventListener("click", handleJump); // Jump to cell
            input.removeEventListener("keydown", (e) => {});
        };
    }, [scrollOffset]);

    /**
     * Synchronises scrolling between the grid body and the headers so that it works
     * like one, whole grid. Currently, does not synchronise scrolling done on the headers.
     * @param scrollLeft Horizontal scrolling value
     * @param scrollTop Vertical scrolling value
     */
    const syncScroll = ({
        scrollLeft,
        scrollTop,
    }: {
        scrollLeft: any;
        scrollTop: any;
    }) => {
        if (scrollLeft !== undefined) {
            if (colHeaderRef.current) {
                colHeaderRef.current.scrollTo({ scrollLeft });
            }
        }
        if (scrollTop !== undefined) {
            if (rowHeaderRef.current) {
                rowHeaderRef.current.scrollTo({ scrollTop });
            }
        }
        setScrollOffset({ left: scrollLeft, top: scrollTop });
    };

    return (
        // Container that wraps around all parts of the sheet
        <div id="sheet">
            <SheetHeader />
            {/* Header row as a 1-row grid */}
            <div style={{ display: "flex" }}>
                {/* Top-left corner */}
                <div
                    id="headerCorner"
                    style={{
                        // Has to be defined here to use dimensions of the sheet
                        width: rowHeaderWidth - 1,
                        height: colHeaderHeight - 1,
                    }}
                >
                    {""}
                </div>
                {/* Column headers as a grid */}
                <Grid
                    columnCount={columnCount}
                    columnWidth={(): number => columnWidth}
                    height={colHeaderHeight}
                    rowCount={1}
                    rowHeight={(): number => colHeaderHeight}
                    width={width - rowHeaderWidth}
                    overscanColumnCount={5}
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
                    columnWidth={(): number => rowHeaderWidth}
                    height={height - colHeaderHeight}
                    rowCount={rowCount}
                    rowHeight={(): number => rowHeight}
                    width={rowHeaderWidth}
                    overscanRowCount={5}
                    ref={rowHeaderRef}
                >
                    {RowHeader}
                </Grid>

                {/* Grid body */}
                <div id="gridBody">
                    <Grid
                        columnCount={columnCount}
                        columnWidth={(): number => columnWidth}
                        height={height - colHeaderHeight}
                        rowCount={rowCount}
                        rowHeight={(): number => rowHeight}
                        width={width - rowHeaderWidth}
                        onItemsRendered={() => EvalCellsInViewport()}
                        overscanColumnCount={5}
                        overscanRowCount={5}
                        ref={bodyRef}
                        onScroll={syncScroll}
                    >
                        {GridCell}
                    </Grid>
                </div>
            </div>
            <SheetFooter
                sheetNames={sheetNames}
                activeSheet={activeSheet}
                setActiveSheet={setActiveSheet}
                setSheetNames={setSheetNames}
            />
        </div>
    );
};
