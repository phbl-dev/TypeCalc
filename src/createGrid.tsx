import ReactDOM from "react-dom/client";
import {getCell, VirtualizedGrid} from "./virtualizedGrid";

export const createGrid = () => {
    const input = (document.getElementById("sheetInput") as HTMLInputElement).value || "64000x1000000";
    const sheetDimensions = input.split("x");
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<VirtualizedGrid columnCount={parseInt(sheetDimensions[0])} rowCount={parseInt(sheetDimensions[1])}/>);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();

    // Adds an event listener that acts when the associated button is clicked,
    // which calls the 'newTable()' function.
    const button = document.getElementById("create") as HTMLButtonElement;
    button.addEventListener("click", createGrid);

    // Alternatively, the same event can also be executed using the 'Enter'-key
    // when standing in the sheetInput field.
    const input = document.getElementById(
        "sheetInput",
    ) as HTMLInputElement;
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            createGrid();
        }
    });
})