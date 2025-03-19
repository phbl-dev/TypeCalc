import ReactDOM from "react-dom/client";
import {VirtualizedGrid} from "./virtualizedGrid.tsx";

export const createGrid = () => {
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<VirtualizedGrid columnCount={200} rowCount={200}/>);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
})