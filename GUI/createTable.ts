// Converts a number n into a corresponding letter A-Z. If n > 26, it assigns multiple letters, e.g.,
// AA-AZ, BA-BZ, etc.
function numberToLetters(n: number) {
  let letter = "";
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
  const inputElem = document.getElementById("sheetInput") as HTMLInputElement;
  const input = inputElem.value || "20x20";
  const sheetDimensions = input.split("x");
  createTable(parseInt(sheetDimensions[0]), parseInt(sheetDimensions[1]));
}

/* Creates a table with the specified number of rows and columns, where the first column and first row are
 * labeled with numbers and letters, respectively.
 */
function createTable(rows: number, columns: number) {
  /* 'document' represents the html. Typescript can manipulate the document structure through 'document'.
   * 'document.createElement' creates the HTML element specified by the tagName which is 'table' here.<br>
   * 'table': The HTMLTableElement interface provides special properties and methods for manipulating the
   * layout and presentation of tables in an HTML document. We also get the specific <div> we want the
   * table to be created in.
   */
  let table = document.getElementById(
    "dynamicTable",
  ) as HTMLTableElement | null;
  const location = document.getElementById("tableContainer") as HTMLDivElement;

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
  const header = document.createElement("tr");
  for (let j = 0; j <= columns; j++) {
    const headerCell = document.createElement("th");
    if (j > 0) {
      headerCell.textContent = numberToLetters(j);
      headerCell.classList.add("columnHeader");
    }
    header.appendChild(headerCell);
  }
  table.appendChild(header);

  // For every row 'tr', we create all its columns as cells
  for (let i = 1; i <= rows; i++) {
    const row = document.createElement("tr");

    for (let j = 0; j <= columns; j++) {
      // Creates row labels
      if (i > 0 && j === 0) {
        const rowHeader = document.createElement("th");
        rowHeader.classList.add("rowHeader");
        rowHeader.textContent = i.toString();
        row.appendChild(rowHeader);
      }
      // Creates all the regular cells 'td'
      else {
        const cell = document.createElement("td");

        // Make td cells editable and creates a localStorage of the input in that cell
        cell.contentEditable = "true"; // making the cells editable
        const cellID = `${numberToLetters(j)}${i}`; // Creates a cellID in A1 notation
        // In case of reloading the page (not resetting) we will save the locally stored cells:
        const savedContent = localStorage.getItem(cellID);
        if (savedContent) {
          //If there is savedContent, restore it to the cell
          cell.textContent = savedContent;
        }

        // We store an Item which consists of a key-value pair for each cell. The key will be the
        // cellID and the value will either be what we inputted in the browser or an empty string.
        cell.addEventListener("input", () => {
          localStorage.setItem(cellID, cell.textContent || "");
        });
        row.appendChild(cell);
      }
    }
    table.appendChild(row);
  }
}

// 'DOMContentLoaded' ensures the script first tries to access elements after
// the page has fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  newTable(); // Creates the initial table

  // Adds an event listener that acts when the associated button is clicked,
  // which calls the 'newTable()' function.
  const button = document.getElementById("create") as HTMLButtonElement;
  button.addEventListener("click", newTable);

  // Alternatively, the same event can also be executed using the 'Enter'-key
  // when standing in the sheetInput field.
  const tableFromInput = document.getElementById(
    "sheetInput",
  ) as HTMLInputElement;
  tableFromInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      newTable();
    }
  });
});
