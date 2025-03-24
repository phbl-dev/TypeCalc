"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WorkbookIO_1 = require("../src/WorkbookIO");
// Converts a number n into a corresponding letter A-Z. If n > 26, it assigns multiple letters, e.g.,
// AA-AZ, BA-BZ, etc.
function numberToLetters(n) {
    var letter = "";
    while (n > 0) {
        n--; // Required so that 1 = 'A'
        letter = String.fromCharCode((n % 26) + 65) + letter;
        n = Math.floor(n / 26);
    }
    return letter;
}
/* Creates a new table based on input from the text field next to the "Create
 * new sheet" button. The input should be provided as a Y and an X value separated
 * by an 'x'. The function splits on 'x' and creates a table with the given input.
 * If no input has been given, it creates a 20x20 table.
 */
function newTable() {
    var inputElem = document.getElementById("sheetInput");
    var input = inputElem.value || "20x20";
    var sheetDimensions = input.split("x");
    table(parseInt(sheetDimensions[0]), parseInt(sheetDimensions[1]));
}
function loadFile() {
    var fileName = document.getElementById("fileName");
    var input = fileName.value;
    var fileReader = new WorkbookIO_1.XMLReader();
    fileReader.readFile(input);
}

/* Creates a table with the specified number of rows and columns, where the first column and first row are
 * labeled with numbers and letters, respectively.
 */
function table(rows, columns) {
    /* 'document' represents the html. Typescript can manipulate the document structure through 'document'.
     * 'document.createElement' creates the HTML element specified by the tagName which is 'table' here.<br>
     * 'table': The HTMLTableElement interface provides special properties and methods for manipulating the
     * layout and presentation of tables in an HTML document. We also get the specific <div> we want the
     * table to be created in.
     */
    var table = document.getElementById("dynamicTable");
    var location = document.getElementById("tableContainer");
    /* The .appendChild() function adds a node to the end list of children of a specified parent node.
     */
    // If a table does not already exist, creates one in the <div> specified above.
    if (!table) {
        table = document.createElement("table");
        table.id = "dynamicTable";
        location.appendChild(table);
    }
    // Clears the existing table BUT NOT ITS CONTENTS
    table.innerHTML = "";
    // Creates the header row
    var header = document.createElement("tr");
    for (var j = 0; j <= columns; j++) {
        var headerCell = document.createElement("th");
        if (j > 0) {
            headerCell.textContent = numberToLetters(j);
            headerCell.classList.add("columnHeader");
        }
        header.appendChild(headerCell);
    }
    table.appendChild(header);
    // For every row 'tr', we create all its columns as cells
    for (var i = 1; i <= rows; i++) {
        var row = document.createElement("tr");
        var _loop_1 = function (j) {
            // Creates row labels
            if (i > 0 && j === 0) {
                var rowHeader = document.createElement("th");
                rowHeader.classList.add("rowHeader");
                rowHeader.textContent = i.toString();
                row.appendChild(rowHeader);
            }
            // Creates all the regular cells 'td'
            else {
                var cell_1 = document.createElement("td");
                // Make td cells editable and creates a localStorage of the input in that cell
                cell_1.contentEditable = "true"; // making the cells editable
                var cellID_1 = "".concat(numberToLetters(j)).concat(i); // Creates a cellID in A1 notation
                // In case of reloading the page (not resetting) we will save the locally stored cells:
                var savedContent = localStorage.getItem(cellID_1);
                if (savedContent) {
                    //If there is savedContent, restore it to the cell
                    cell_1.textContent = savedContent;
                }
                // We store an Item which consists of a key-value pair for each cell. The key will be the
                // cellID and the value will either be what we inputted in the browser or an empty string.
                cell_1.addEventListener("input", function () {
                    localStorage.setItem(cellID_1, cell_1.textContent || "");
                });
                row.appendChild(cell_1);
            }
        };
        for (var j = 0; j <= columns; j++) {
            _loop_1(j);
        }
        table.appendChild(row);
    }
}
// function showCell(col:number, row:number, value:string):void {
//   //Here we convert a col and row to an A1-format, but this is actually already done in cell
//   //addressing, so can maybe find a better signature and call it directly.
//   const cellID:string = `${numberToLetters(col)}${row}`;
//   localStorage.setItem(cellID, value);
// }
// 'DOMContentLoaded' ensures the script first tries to access elements after
// the page has fully loaded.
document.addEventListener("DOMContentLoaded", function () {
    newTable(); // Creates the initial table
    // Adds an event listener that acts when the associated button is clicked,
    // which calls the 'newTable()' function.
    var button = document.getElementById("create");
    button.addEventListener("click", newTable);
    // const readFileButton:HTMLElement = document.getElementById("readFile");
    // readFileButton.addEventListener("click", loadFile)
    // Alternatively, the same event can also be executed using the 'Enter'-key
    // when standing in the sheetInput field.
    var tableFromInput = document.getElementById("sheetInput");
    tableFromInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            newTable();
        }
    });
});
