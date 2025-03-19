import { Grid } from 'react-virtualized';
import React, { useRef } from "react";

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

// Defines the column headers
function colHeaderRenderer({ columnIndex, key, style }) {
    return React.createElement("div", { key,
        style: { ...style,
            borderRight: '1px solid black',
            borderBottom: '1px solid black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center' }},
        `${numberToLetters(columnIndex+1)}`
    );
}

// Defines the row headers
function rowHeaderRenderer({ rowIndex, key, style }) {
    return React.createElement("div", { key,
        style: { ...style,
            borderLeft: '1px solid black',
            borderBottom: '1px solid black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center' }},
        `${rowIndex+1}`
    );
}

// Defines the regular cells
function cellRenderer({ columnIndex, key, rowIndex, style }) {
    const ID = numberToLetters(columnIndex+1) + (rowIndex+1).toString();
    return React.createElement("div", { key,
        contentEditable: true,
        style: { ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ddd',
            background: rowIndex % 2 === 0 ? 'lightgrey' : 'white' } },
        //`${ID}`
    );
}

// Created as an interface so that it can take input for the size
export const VirtualizedGrid: React.FC<GridInterface> = ({
    columnCount,
    rowCount,
    columnWidth = 70,
    rowHeight = 25,
    colHeaderHeight = rowHeight*1.2,
    rowHeaderWidth = columnWidth*0.75,
    width = window.innerWidth,
    height = window.innerHeight * 0.9201,
}) => {
    const colHeaderRef = useRef<Grid | null>(null);
    const rowHeaderRef = useRef<Grid | null>(null);
    const bodyRef = useRef<Grid | null>(null);

    /* Synchronizes scrolling as the grid is technically 4 grids put together */
    function syncScroll({ scrollLeft, scrollTop }: {scrollLeft: number; scrollTop: number}) {
        if (colHeaderRef.current)
            colHeaderRef.current.scrollToPosition({ scrollLeft, scrollTop:0 });
        if (rowHeaderRef.current)
            rowHeaderRef.current.scrollToPosition({ scrollTop, scrollLeft:0 });
    }

    return React.createElement("div", null,
        React.createElement( "div", { // Creates the top header row + corner
            id: "topHeaders" },
            React.createElement( // Corner elem
                "div", { id: "headerCorner", style: {
                    width: rowHeaderWidth,
                    height: colHeaderHeight}}, "#"),
            React.createElement( Grid, {
                id: "colHeaders",
                ref: colHeaderRef,
                cellRenderer: colHeaderRenderer,
                columnCount, columnWidth,
                height: colHeaderHeight,
                rowCount: 1,
                rowHeight: colHeaderHeight,
                width: (width - rowHeaderWidth),
                onScroll: syncScroll }),
        ),
        // Creates the rest of the grid
        React.createElement( "div", { className: "gridBody" },
            React.createElement( Grid, { // Creates the row headers
                    id: "rowHeaders",
                    ref: rowHeaderRef,
                    cellRenderer: rowHeaderRenderer,
                    columnCount: 1,
                    columnWidth: rowHeaderWidth,
                    height: (height - colHeaderHeight),
                    rowCount, rowHeight,
                    width: rowHeaderWidth,
                    onscroll: syncScroll }),
            React.createElement( Grid, { // Creates the regular cells
                    id: "gridBody",
                    ref: bodyRef,
                    cellRenderer: cellRenderer,
                    columnCount, columnWidth,
                    height: (height - colHeaderHeight),
                    rowCount, rowHeight,
                    width: (width - rowHeaderWidth),
                    onScroll: syncScroll }),
        )
    );
};

