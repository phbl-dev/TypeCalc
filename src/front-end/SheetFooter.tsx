import { WorkbookManager } from "../API-Layer/WorkbookManager.ts";
import { EvalCellsInViewport } from "../API-Layer/Back-endEndpoints.ts";
import { Sheet } from "../back-end/Sheet.ts";
import React from "react";

interface SheetSelectorProps {
    sheetNames: string[];
    activeSheet: string;
    setActiveSheet: (sheetName: string) => void;
    setSheetNames: (sheetNames: string[]) => void;
}

/**
 * Used to differentiate between multiple sheets.
 * @param sheetNames
 * @param activeSheet
 * @param setActiveSheet
 * @param setSheetNames
 * @constructor
 */
// @ts-ignore
export const SheetFooter: React.FC<SheetSelectorProps> = ({
    sheetNames,
    activeSheet,
    setActiveSheet,
    setSheetNames,
}: SheetSelectorProps) => {
    return (
        <footer style={{ display: "flex", gap: "1px" }}>
            {sheetNames.map((name: any) => (
                <button
                    key={name}
                    onClick={() => {
                        setActiveSheet(name);
                        WorkbookManager.setActiveSheet(name);
                        EvalCellsInViewport();
                        document.getElementById("documentTitle")!.innerText =
                            WorkbookManager.getActiveSheetName();
                    }}
                    style={{
                        backgroundColor:
                            activeSheet === name ? "darkslategrey" : "",
                        color: activeSheet === name ? "" : "",
                        fontWeight: activeSheet === name ? "" : "normal",
                        borderBottom:
                            activeSheet === name ? "3px solid #4a7e76" : "",
                        borderRadius: activeSheet === name ? "0" : "",
                        height: activeSheet === name ? "22px" : "",
                    }}
                >
                    {name}
                </button>
            ))}
            <button
                id="createSheetButton"
                onClick={() => {
                    const newSheetName = window.prompt(
                        "Enter an unused Sheet Name",
                    );
                    if (
                        newSheetName &&
                        !sheetNames.includes(newSheetName) &&
                        newSheetName.trim() !== ""
                    ) {
                        const newSheet = new Sheet(
                            WorkbookManager.getWorkbook(),
                            newSheetName,
                            65536,
                            1048576,
                            false,
                        );
                        WorkbookManager.getWorkbook().AddSheet(newSheet);
                        setSheetNames([...sheetNames, newSheetName]);
                    }
                }}
            >
                +
            </button>
        </footer>
    );
};
