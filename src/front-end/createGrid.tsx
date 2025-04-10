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
    let button = document.getElementById("bold");
    if (!cell || !button) { return null; }

    if (cell.style.fontWeight === "bold") {
        cell.style.fontWeight = "normal";
        button.style.border = "none";
    }
    else {
        cell.style.fontWeight = "bold";
        button.style.border = "2px solid white";
    }
}

export function makeItalic() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    let button = document.getElementById("italic");
    if (!cell || !button) { return null; }

    if (cell.style.fontStyle === "italic") {
        cell.style.fontStyle = "normal";
        button.style.border = "none";
    }
    else {
        cell.style.fontStyle = "italic";
        button.style.border = "2px solid white";
    }
}

export function makeUnderlined() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    let button = document.getElementById("underline");
    if (!cell || !button) { return null; }

    if (cell.style.textDecoration === "underline") {
        cell.style.textDecoration = "none";
        button.style.border = "none";
    }
    else {
        cell.style.textDecoration = "underline";
        button.style.border = "2px solid white";
    }
}

export function setCellColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById("cellColorPicker") as HTMLInputElement;
    if (!cell || !colorPicker) { return null; }

    if(colorPicker.value) {
        cell.style.backgroundColor = colorPicker.value;
    }
}

export function setTextColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) { return null; }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById("textColorPicker") as HTMLInputElement;
    if (!cell || !colorPicker) { return null; }

    if(colorPicker.value) {
        cell.style.color = colorPicker.value;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
})