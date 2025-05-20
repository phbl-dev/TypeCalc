import React, { useEffect, useRef, useState } from "react";
import {VariableSizeGrid as Grid } from "react-window";
import {XMLWriter, XMLReader} from "../API-Layer/WorkbookIO.ts";
import {WorkbookManager} from "../API-Layer/WorkbookManager.ts";
import {EvalCellsInViewport, ParseToActiveCell} from "../API-Layer/Back-endEndpoints.ts";
import {
    getCell, numberToLetters, lettersToNumber, makeBold,
    makeItalic, makeUnderlined, setCellColor, setTextColor
} from "./HelperFunctions.tsx";
import {GridCell} from "./GridCell.tsx";
import {SheetSelector} from "./SheetSelector.tsx";

// Created interface so that we can modify columnCount and rowCount when creating the grid
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

/** Creates the sheet itself with headers and body. It extends the GridInterface so that
 * we can create a sheet with a self-defined number of rows and columns.
 * The sheet itself consists of a top row flexbox with a corner cell and a row of column
 * headers created as a Grid. The main body itself is also a flexbox, consisting of two
 * additional grids; one for the row headers and one for the regular cells.
 */
export const VirtualizedGrid: React.FC<GridProps> = (({
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
    let [scrollOffset] = useState({left: 0, top: 0});
    let [sheetNames, setSheetNames] = useState<string[]>(["Sheet1"]);
    let [activeSheet, setActiveSheet] = useState(sheetNames[0]);

    const [, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });



    useEffect(() => {
        const formulaBox = document.getElementById("formulaBox") as HTMLInputElement;
        const input = document.getElementById("cellIdInput") as HTMLInputElement;
        const jumpButton = document.getElementById("jumpToCell") as HTMLButtonElement;
        const xmlExport = document.getElementById("xmlExport") as HTMLElement;
        const csvExport = document.getElementById("csvExport") as HTMLElement;
        const boldButton = document.getElementById("bold") as HTMLButtonElement;
        const italicButton = document.getElementById("italic") as HTMLButtonElement;
        const underlineButton = document.getElementById("underline") as HTMLButtonElement;
        const cellColor = document.getElementById("cellColorPicker") as HTMLInputElement;
        const textColor = document.getElementById("textColorPicker") as HTMLInputElement;

        addEventListener('resize', () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight * 0.92
            });
        })

        // Handles formulaBox input
        let value: string;
        let valueChanged: boolean = false;
        const handleFormulaChange = (e: Event) => {
            value = (e.target as HTMLInputElement).value;
            valueChanged = true;
            let activeCell = document.getElementById(WorkbookManager.getActiveCell()!);
            if (activeCell) {
                activeCell.innerHTML = value;
            }
        };

        // Updates cells when changing the value of a cell
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                if (valueChanged) {
                    updateCellContents();
                }
            }
        }

        // Updates cells when leaving if entering a different cell and the value was change
        const handleBlur = () => {
            if (valueChanged) {
                updateCellContents();
            }
        }

        // Does the actual updating
        const updateCellContents = () => {
            valueChanged = false;
            ParseToActiveCell(value);
            EvalCellsInViewport(scrollOffset.left, scrollOffset.left + 30, scrollOffset.top, scrollOffset.top + 30);
        }

        // Handles the "Go to"/jump to a specific cell. Currently, bugged when trying to focus a cell off-screen
        // and must trigger twice to do so.
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
                            rowIndex: row
                        });

                        // Delay to ensure the cell renders first
                        setTimeout(() => {
                            const targetCell = getCell(cellID);
                            if (targetCell) {
                                targetCell.focus();
                            }
                        }, 50);
                    }
                }
            }
        }

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
                        sheetNames = WorkbookManager.getSheetNames();
                        setSheetNames(sheetNames);
                        setActiveSheet(sheetNames[0]);
                        WorkbookManager.setActiveSheet(sheetNames[0]);
                        EvalCellsInViewport(scrollOffset.left, scrollOffset.left + 30, scrollOffset.top, scrollOffset.top + 30);
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

        // Event listener management
        //--------------------------------------
        window.addEventListener("drop", handleDrop); // Drag and drop
        window.addEventListener("dragover", handleDragOver); // Drag and drop

        formulaBox.addEventListener("keydown", handleKeyDown);
        formulaBox.addEventListener("blur", handleBlur);
        formulaBox.addEventListener("input", handleFormulaChange);

        jumpButton.addEventListener("click", handleJump); // Jump to cell
        input.addEventListener("keydown", (e) => { // Jump to cell
            if (e.key === "Enter") handleJump();})
        xmlExport.addEventListener("click", new XMLWriter().exportAsXML)
        csvExport.addEventListener("click", new XMLWriter().exportAsCSV)
        boldButton.addEventListener("click", makeBold)
        italicButton.addEventListener("click", makeItalic)
        underlineButton.addEventListener("click", makeUnderlined)

        cellColor.addEventListener("input", setCellColor);
        textColor.addEventListener("input", setTextColor);

        return () => {
            window.removeEventListener("drop", handleDrop); // Drag and drop
            window.removeEventListener("dragover", handleDragOver); // Drag and drop
            formulaBox.removeEventListener("input", handleFormulaChange);
            formulaBox.removeEventListener("keydown", handleKeyDown);
            formulaBox.removeEventListener("blur", handleBlur);
            xmlExport.removeEventListener("click", new XMLWriter().exportAsXML);
            csvExport.removeEventListener("click", new XMLWriter().exportAsCSV);
            jumpButton.removeEventListener("click", handleJump); // Jump to cell
            boldButton.removeEventListener("click", makeBold)
            italicButton.removeEventListener("click", makeItalic)
            underlineButton.removeEventListener("click", makeUnderlined)
        };
    }, [scrollOffset]);

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
                         height: colHeaderHeight-1,
                     }}
                >
                    {""}
                </div>
                {/* Column headers as a grid */}
                <Grid
                    columnCount={columnCount}
                    columnWidth={(): number  => columnWidth}
                    height={colHeaderHeight}
                    rowCount={1}
                    rowHeight={(): number => colHeaderHeight}
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
                    columnWidth={(): number => rowHeaderWidth}
                    height={height - colHeaderHeight}
                    rowCount={rowCount}
                    rowHeight={(): number => rowHeight}
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
                        columnWidth={(): number => columnWidth}
                        height={height - colHeaderHeight}
                        rowCount={rowCount}
                        rowHeight={(): number => rowHeight}
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
                            EvalCellsInViewport(
                                visibleColumnStartIndex,
                                visibleColumnStopIndex + 1, // +1 because the stop index is inclusive
                                visibleRowStartIndex,
                                visibleRowStopIndex + 1
                            );
                        }}
                    >
                        {GridCell}
                    </Grid>
                </div>
            </div>
        </div>
    );
});
