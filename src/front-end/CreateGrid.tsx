import ReactDOM from "react-dom/client";
import { VirtualizedGrid } from "./SpreadsheetGrid.tsx";

/**
 * Renders the grid to the DOM with the specified number of columns and rows.
 * @constructor
 */
export const renderGrid = () => {
    const location = document.getElementById("root");
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(
            <VirtualizedGrid columnCount={65536} rowCount={1048576} />,
        );
    }
};

document.addEventListener("DOMContentLoaded", () => {
    renderGrid();
});
