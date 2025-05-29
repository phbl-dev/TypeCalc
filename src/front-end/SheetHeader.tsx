import React, { useEffect } from "react";
import { WorkbookManager } from "../API-Layer/WorkbookManager.ts";
import { XMLWriter } from "../API-Layer/WorkbookIO.ts";

/**
 * Makes the cell's text bold
 */
export function makeBold() {
  let cellID = WorkbookManager.getActiveCell();
  if (!cellID) {
    return null;
  }

  let cell = document.getElementById(cellID);
  let button = document.getElementById("bold");
  if (!cell || !button) {
    return null;
  }

  if (cell.style.fontWeight === "bold") {
    cell.style.fontWeight = "normal";
    button.style.outline = "none";
  } else {
    cell.style.fontWeight = "bold";
    button.style.outline = "2px solid white";
  }
}

/**
 * Makes the cell's text italic
 */
export function makeItalic() {
  let cellID = WorkbookManager.getActiveCell();
  if (!cellID) {
    return null;
  }

  let cell = document.getElementById(cellID);
  let button = document.getElementById("italic");
  if (!cell || !button) {
    return null;
  }

  if (cell.style.fontStyle === "italic") {
    cell.style.fontStyle = "normal";
    button.style.outline = "none";
  } else {
    cell.style.fontStyle = "italic";
    button.style.outline = "2px solid white";
  }
}

/**
 * Makes the cell's text underlined
 */
export function makeUnderlined() {
  let cellID = WorkbookManager.getActiveCell();
  if (!cellID) {
    return null;
  }

  let cell = document.getElementById(cellID);
  let button = document.getElementById("underline");
  if (!cell || !button) {
    return null;
  }

  if (cell.style.textDecoration === "underline") {
    cell.style.textDecoration = "none";
    button.style.outline = "none";
  } else {
    cell.style.textDecoration = "underline";
    button.style.outline = "2px solid white";
  }
}

/**
 * Changes the background colour of the cell
 */
export const SheetHeader: React.FC = () => {
  function resetWorkbook() {
    localStorage.clear();
    location.reload();
  }

  function setCellColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) {
      return null;
    }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById(
      "cellColorPicker",
    ) as HTMLInputElement;
    if (!cell || !colorPicker) {
      return null;
    }

    if (colorPicker.value) {
      cell.style.backgroundColor = colorPicker.value;
    }
  }

  /**
   * Changes the colour of the text in a cell
   */
  function setTextColor() {
    let cellID = WorkbookManager.getActiveCell();
    if (!cellID) {
      return null;
    }

    let cell = document.getElementById(cellID);
    const colorPicker = document.getElementById(
      "textColorPicker",
    ) as HTMLInputElement;
    if (!cell || !colorPicker) {
      return null;
    }

    if (colorPicker.value) {
      cell.style.color = colorPicker.value;
    }
  }

  // Used to create all the EventListeners needed by SheetHeader functions and remove them at the end
  useEffect(() => {
    const resetButton = document.getElementById("reset") as HTMLButtonElement;
    const xmlExport = document.getElementById("xmlExport") as HTMLElement;
    const csvExport = document.getElementById("csvExport") as HTMLElement;
    const boldButton = document.getElementById("bold") as HTMLButtonElement;
    const italicButton = document.getElementById("italic") as HTMLButtonElement;
    const underlineButton = document.getElementById(
      "underline",
    ) as HTMLButtonElement;
    const cellColor = document.getElementById(
      "cellColorPicker",
    ) as HTMLInputElement;
    const textColor = document.getElementById(
      "textColorPicker",
    ) as HTMLInputElement;

    resetButton.addEventListener("click", resetWorkbook);
    xmlExport.addEventListener("click", new XMLWriter().exportAsXML);
    csvExport.addEventListener("click", new XMLWriter().exportAsCSV);
    boldButton.addEventListener("click", makeBold);
    italicButton.addEventListener("click", makeItalic);
    underlineButton.addEventListener("click", makeUnderlined);

    cellColor.addEventListener("input", setCellColor);
    textColor.addEventListener("input", setTextColor);

    return () => {
      resetButton.removeEventListener("click", resetWorkbook);
      xmlExport.removeEventListener("click", new XMLWriter().exportAsXML);
      csvExport.removeEventListener("click", new XMLWriter().exportAsCSV);
      boldButton.removeEventListener("click", makeBold);
      italicButton.removeEventListener("click", makeItalic);
      underlineButton.removeEventListener("click", makeUnderlined);
    };
  });

  return (
    <header>
      <button className="menuButton" type="reset" id="reset">
        Clear
      </button>
      <div className="dropdown">
        <button className="dropbtn">Export</button>
        <div className="dropdown-content">
          <button className="dropdownOption" id="xmlExport">
            XML
          </button>
          <button className="dropdownOption" id="csvExport">
            CSV
          </button>
        </div>
      </div>

      <button className="menuButton" type="button" id="jumpToCell">
        Go to
      </button>
      <label htmlFor="cellIdInput"></label>
      <input className="menuTextField" type="text" id="cellIdInput" />
      <button className="styleButton" type="button" id="bold">
        B
      </button>
      <button className="styleButton" type="button" id="italic">
        I
      </button>
      <button className="styleButton" type="button" id="underline">
        U
      </button>
      <div id="cellColor">
        <label htmlFor="cellColorPicker" className="colorLabel">
          Cell
        </label>
        <input
          className="color"
          type="color"
          id="cellColorPicker"
          value="#000000"
        />
      </div>
      <div id="textColor">
        <label htmlFor="textColorPicker" className="colorLabel">
          Text
        </label>
        <input
          className="color"
          type="color"
          id="textColorPicker"
          value="#000000"
        />
      </div>
      <label htmlFor="formulaBox"></label>
      <input className="formulaBox" type="text" id="formulaBox" />
      <h4 id="documentTitle">Sheet1</h4>
    </header>
  );
};
