import ReactDOM from "react-dom/client";
import { VirtualizedGrid } from "./virtualizedGrid.tsx";
import { jumpToCell } from "./navbarFunctions.tsx";

export const createGrid = () => {
    const location = document.getElementById('root');
    if (location) {
        const table = ReactDOM.createRoot(location);
        table.render(<VirtualizedGrid columnCount={64000} rowCount={1000000}/>);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();

    // Adds an event listener that acts when the associated button is clicked,
    // which calls the 'newTable()' function.
    const createButton = document.getElementById("jumpToCell") as HTMLButtonElement;
    createButton.addEventListener("click", jumpToCell);

    // Alternatively, the same event can also be executed using the 'Enter'-key
    // when standing in the sheetInput field.
    const input = document.getElementById("jumpToInput") as HTMLInputElement;
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            jumpToCell();
        }
    });
})