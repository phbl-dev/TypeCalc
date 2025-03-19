import React, { useRef } from "react";
import { FixedSizeGrid as Grid } from "react-window";

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
}

// Converts a number to a letter or multiple (AA, AB, ..., AZ etc.)
function numberToLetters(n: number) {
    let letter = "";
    while (n > 0) {
        n--; // Required so that 1 = 'A'
        letter = String.fromCharCode((n % 26) + 65) + letter;
        n = Math.floor(n / 26);
    }
    return letter;
}

// Defines the column headers as a div with ID, style, and contents
const ColumnHeader = ({ columnIndex, style }) => (
    <div id="columnHeaders"
         style={{
             ...style, // Inherit style from style.css
         }}
    >
        {numberToLetters(columnIndex + 1)}
    </div>
);

// Defines the row headers as a div with ID, style, and contents
const RowHeader = ({ rowIndex, style }) => (
    <div id="rowHeaders"
         style={{
             ...style, // Inherit style from style.css
         }}
    >
        {rowIndex + 1}
    </div>
);

// Defines the regular cell along with an ID in A1 format
const Cell = ({ columnIndex, rowIndex, style }) => {
    const ID = numberToLetters(columnIndex + 1) + (rowIndex + 1);
    return (
        <div className="Cell" contentEditable={true} id={ID}
             style={{
                 ...style, // Inherit style from style.css
                 background: rowIndex % 2 === 0 ? "lightgrey" : "white", // Gives 'striped' look to main body
             }}
        >
        </div>
    );
};

/* Creates the sheet itself with headers and body. It extends the GridInterface so that
 * we can create a sheet with a self-defined amount of rows and columns.
 * The sheet itself consists of a top row flexbox with a corner cell and a row of column
 * headers created as a Grid. The main body itself is also a flexbox, consisting of two
 * additional grids; one for the row headers and one for the regular cells.
 */
export const VirtualizedGrid: React.FC<GridInterface> = ({
     columnCount,
     rowCount,
     columnWidth = 80,
     rowHeight = 25,
     colHeaderHeight = rowHeight * 1.2,
     rowHeaderWidth = columnWidth * 0.65,
     width = window.innerWidth,
     height = window.innerHeight * 0.92,
 }) => {
    // Used to synchronize scrolling between the referenced objects
    const colHeaderRef = useRef<Grid>(null);
    const rowHeaderRef = useRef<Grid>(null);
    const bodyRef = useRef<Grid>(null);

    // Synchronizes scrolling
    function syncScroll({ scrollLeft, scrollTop }: { scrollLeft?: number; scrollTop?: number }) {
        if (colHeaderRef.current && scrollLeft !== undefined) {
            colHeaderRef.current.scrollTo({ scrollLeft, scrollTop: 0 });
        }
        if (rowHeaderRef.current && scrollTop !== undefined) {
            rowHeaderRef.current.scrollTo({ scrollTop, scrollLeft: 0 });
        }
    }

    return (
        // Container that wraps around all parts of the sheet
        <div id="sheet">
            {/* Header row as a 1-row grid */}
            <div style={{ display: "flex" }}>
                {/* Top-left corner */}
                <div id="headerCorner"
                     style={{ // Has to be defined here to use dimensions of the sheet
                         width: rowHeaderWidth-1,
                         height: colHeaderHeight,
                     }}
                >
                    #
                </div>
                {/* Column headers as a grid */}
                <Grid
                    ref={colHeaderRef}
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={colHeaderHeight}
                    rowCount={1}
                    rowHeight={colHeaderHeight}
                    width={width - rowHeaderWidth}
                >
                    {ColumnHeader}
                </Grid>
            </div>

            {/* Remaining grid */}
            <div style={{ display: "flex" }}>
                {/* Row headers */}
                <Grid
                    ref={rowHeaderRef}
                    columnCount={1}
                    columnWidth={rowHeaderWidth}
                    height={height - colHeaderHeight}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    width={rowHeaderWidth}
                >
                    {RowHeader}
                </Grid>

                {/* Grid body */}
                <Grid
                    ref={bodyRef}
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={height - colHeaderHeight}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    width={width - rowHeaderWidth}
                    onScroll={syncScroll}
                >
                    {Cell}
                </Grid>
            </div>
        </div>
    );
};
