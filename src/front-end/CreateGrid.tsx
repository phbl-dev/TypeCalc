import ReactDOM from "react-dom/client";
import { SpreadsheetGrid } from "./SpreadsheetGrid.tsx";

export const renderGrid = () => {
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<SpreadsheetGrid columnCount={64000} rowCount={1000000}/>);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
})