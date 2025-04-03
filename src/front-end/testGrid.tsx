import React, { createContext, forwardRef, useContext, useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./testStyle.css";
import { VariableSizeGrid as Grid, VariableSizeGridProps } from "react-window";

// Define context type
interface StickyGridContextType {
    ItemRenderer: React.FC<{ rowIndex: number; columnIndex: number; style: React.CSSProperties }>;
    stickyRows: number[];
    stickyColumns: number[];
    columnWidth: (index: number) => number;
    rowHeight: (index: number) => number;
    columnCount: number;
    rowCount: number;
}

// Create a context
const StickyGridContext = createContext<StickyGridContextType | null>(null);

// Custom hook to use StickyGrid context
const useStickyGrid = (): StickyGridContextType => {
    const context = useContext(StickyGridContext);
    if (!context) {
        throw new Error("useStickyGrid must be used within a StickyGridProvider");
    }
    return context;
};

// Correctly typed InnerElement component
const InnerElement = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(({ children, ...rest }, ref) => {
    return (
        <div ref={ref} {...rest}>
            {children}
        </div>
    );
});

// Custom outer element to wrap everything
const OuterElement = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(({ children, ...rest }, ref) => {
    const {
        stickyRows,
        stickyColumns,
        columnWidth,
        rowHeight,
        columnCount,
        rowCount
    } = useStickyGrid();

    // Calculate sticky row heights and positions
    const rowPositions = useMemo(() => {
        const positions: { [key: number]: number } = {};
        let currentPosition = 0;

        for (let i = 0; i < rowCount; i++) {
            positions[i] = currentPosition;
            currentPosition += rowHeight(i);
        }

        return positions;
    }, [rowHeight, rowCount]);

    // Calculate sticky column widths and positions
    const columnPositions = useMemo(() => {
        const positions: { [key: number]: number } = {};
        let currentPosition = 0;

        for (let i = 2; i < columnCount; i++) {
            positions[i] = currentPosition;
            currentPosition += columnWidth(i);
        }

        return positions;
    }, [columnWidth, columnCount]);

    return (
        <div ref={ref} {...rest} style={{
            ...rest.style,
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Corner cells - sticky at both top and left */}
            {stickyRows.map(rowIndex =>
                stickyColumns.map(colIndex => (
                    <div
                        key={`corner-${rowIndex}-${colIndex}`}
                        className="corner-cell"
                        style={{
                            position: "sticky",
                            width: columnWidth(colIndex),
                            height: rowHeight(rowIndex),
                            background: "#e0e0e0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 3
                        }}
                    >
                        {rowIndex === 0 && colIndex === 0 ? "" : `${rowIndex},${colIndex}`}
                    </div>
                ))
            )}

            {/* Column header cells */}
            {stickyRows.map(rowIndex => (
                <div
                    key={`sticky-row-${rowIndex}`}
                    className="sticky-row"
                    style={{
                        display:"flex",
                        position: "sticky",
                        top: 0,
                        height: rowHeight(rowIndex),
                        width: "100%",
                        zIndex: 2,
                    }}
                >
                    {/* Skip the cells that are part of sticky columns (handled by corner) */}
                    {Array.from({ length: columnCount }).map((_, colIndex) => {
                        if (stickyColumns.includes(colIndex)) return null;

                        return (
                            <div
                                key={`header-row-${rowIndex}-col-${colIndex}`}
                                className="header-cell"
                                style={{
                                    left: columnPositions[colIndex],
                                    top: 0,
                                    width: columnWidth(colIndex),
                                    height: "100%",
                                    background: "#f0f0f0",
                                    borderRight: "1px solid #ddd",
                                    borderBottom: "1px solid #ddd",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                Col {colIndex}
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Row header cells */}
            {stickyColumns.map(colIndex => (
                <div
                    key={`sticky-col-${colIndex}`}
                    className="sticky-column"
                    style={{
                        display:"flex",
                        position: "sticky",
                        left: 0,
                        width: columnWidth(colIndex),
                        zIndex: 2
                    }}
                >
                    {/* Skip the cells that are part of sticky rows (handled by corner) */}
                    {Array.from({ length: rowCount }).map((_, rowIndex) => {
                        if (stickyRows.includes(rowIndex)) return null;

                        return (
                            <div
                                key={`header-col-${colIndex}-row-${rowIndex}`}
                                className="header-cell"
                                style={{
                                    position: "absolute",
                                    top: rowPositions[rowIndex],
                                    left: 0,
                                    height: rowHeight(rowIndex),
                                    width: "100%",
                                    background: "#f0f0f0",
                                    borderRight: "1px solid #ddd",
                                    borderBottom: "1px solid #ddd",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                Row {rowIndex}
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Render the scrollable content */}
            {children}
        </div>
    );
});

// Item wrapper to handle sticky indices
const ItemWrapper: React.FC<{
    data: StickyGridContextType;
    rowIndex: number;
    columnIndex: number;
    style: React.CSSProperties;
}> = ({ data, rowIndex, columnIndex, style }) => {
    const { ItemRenderer, stickyRows, stickyColumns } = data;

    // Skip rendering normal items if they are sticky (they will be handled separately)
    if (stickyRows.includes(rowIndex) || stickyColumns.includes(columnIndex)) return null;

    return <ItemRenderer rowIndex={rowIndex} columnIndex={columnIndex} style={style} />;
};

// Regular cell component
const Cell: React.FC<{ rowIndex: number; columnIndex: number; style: React.CSSProperties }> = ({
                                                                                                   rowIndex,
                                                                                                   columnIndex,
                                                                                                   style
                                                                                               }) => (
    <div
        className="cell"
        style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid #eee",
            borderBottom: "1px solid #eee"
        }}
    >
        Cell {rowIndex}, {columnIndex}
    </div>
);

// Define the props StickyGrid should accept
interface StickyGridProps extends Omit<VariableSizeGridProps, "children" | "itemData"> {
    children: React.FC<{ rowIndex: number; columnIndex: number; style: React.CSSProperties }>;
    stickyRows: number[];
    stickyColumns: number[];
}

// Correctly typed StickyGrid component
const StickyVariableSizeGrid: React.FC<StickyGridProps> = ({
                                                               children,
                                                               stickyRows,
                                                               stickyColumns,
                                                               columnWidth,
                                                               rowHeight,
                                                               columnCount,
                                                               rowCount,
                                                               ...rest
                                                           }) => {
    // Memoize context value
    const contextValue = useMemo(
        () => ({
            ItemRenderer: children,
            stickyRows,
            stickyColumns,
            columnWidth,
            rowHeight,
            columnCount,
            rowCount
        }),
        [children, stickyRows, stickyColumns, columnWidth, rowHeight, columnCount, rowCount]
    );

    return (
        <StickyGridContext.Provider value={contextValue}>
            <Grid
                {...rest}
                columnWidth={columnWidth}
                rowHeight={rowHeight}
                itemData={contextValue}
                columnCount={columnCount}
                rowCount={rowCount}
                className="sticky-grid"
                innerElementType={InnerElement}
                outerElementType={OuterElement}
            >
                {ItemWrapper}
            </Grid>
        </StickyGridContext.Provider>
    );
};

// Mount the app
const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StickyVariableSizeGrid
            height={300}
            width={600}
            columnCount={50}      // Increased to see horizontal scrolling
            rowCount={100}        // Increased to see vertical scrolling
            columnWidth={colIndex => (colIndex === 0 ? 100 : 80)} // Sticky column is wider
            rowHeight={rowIndex => (rowIndex === 0 ? 50 : 35)} // Sticky row is taller
            stickyRows={[0]} // First row is sticky (like a header)
            stickyColumns={[0]} // First column is sticky (like row labels)
        >
            {Cell}
        </StickyVariableSizeGrid>
    );
}