import {WorkbookManager} from "../API-Layer/WorkbookManager.ts";
import {EvalCellsInViewport} from "../API-Layer/Back-endEndpoints.ts";
import {Sheet} from "../back-end/Sheet.ts";

/**
 * Used to differentiate between multiple sheets.
 * @param sheetNames
 * @param activeSheet
 * @param setActiveSheet
 * @param setSheetNames
 * @param scrollOffset
 * @constructor
 */
// @ts-ignore
export const SheetSelector = ({ sheetNames, activeSheet, setActiveSheet, setSheetNames, scrollOffset }) => {
    return (
        <footer style={{ display: 'flex', gap: '1px'}}>
            {sheetNames.map((name:any) => (
                <button
                    key={name}
                    onClick={() => {setActiveSheet(name); WorkbookManager.setActiveSheet(name); EvalCellsInViewport(scrollOffset.left, scrollOffset.left+30, scrollOffset.top, scrollOffset.top+30)
                        document.getElementById("documentTitle")!.innerText = WorkbookManager.getActiveSheetName();}}
                    style={{
                        backgroundColor: activeSheet === name ? 'darkslategrey' : '',
                        color: activeSheet === name ? '' : '',
                        fontWeight: activeSheet === name ? '' : 'normal',
                        borderBottom: activeSheet === name ? '3px solid #4a7e76' : '',
                        borderRadius: activeSheet === name ? '0' : '',
                        height: activeSheet === name ? '22px' : ''
                    }}
                >
                    {name}
                </button>
            ))}
            <button id="createSheetButton"
                    onClick={() => {
                        const newSheetName = window.prompt("Enter an unused Sheet Name");
                        if (newSheetName && !sheetNames.includes(newSheetName) && newSheetName.trim() !== "") {
                            let newSheet = new Sheet(WorkbookManager.getWorkbook(), newSheetName, 65536, 1048576, false);
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