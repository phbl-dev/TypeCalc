import ReactDOM from "react-dom/client";
import {VirtualizedGrid} from "./SpreadsheetGrid.tsx";

export const renderGrid = () => {
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<VirtualizedGrid columnCount={64000} rowCount={1000000}/>);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
})