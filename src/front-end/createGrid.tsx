import ReactDOM from "react-dom/client";
import { VirtualizedGrid } from "./virtualizedGrid.tsx";
import {WorkbookManager} from "../WorkbookIO.ts";

export const createGrid = () => {
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<VirtualizedGrid columnCount={64000} rowCount={1000000}/>);
    }
}

export function makeBold() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    if (!cell) { return null; }

    if (cell.style.fontWeight === "bold") {
        cell.style.fontWeight = "normal";
    }
    else {
        cell.style.fontWeight = "bold";
    }
}

export function makeItalic() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    if (!cell) { return null; }

    if (cell.style.fontStyle === "italic") {
        cell.style.fontStyle = "normal";
    }
    else {
        cell.style.fontStyle = "italic";
    }
}

export function makeUnderlined() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    if (!cell) { return null; }

    if (cell.style.textDecoration === "underline") {
        cell.style.textDecoration = "none";
    }
    else {
        cell.style.textDecoration = "underline";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
})