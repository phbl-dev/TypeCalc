//This is an overarching workbook used for all objects in the system.
//Follows a singleton dogma, since we really never need to have multiple workbooks at the same time.
import {Workbook} from "../back-end/Workbook.ts";
import {Sheet} from "../back-end/Sheet.ts";

/**
 * The WorkbookManager class is a singleton that manages the workbook.
 * It is used to manage the interaction between the front-end and the back-end.
 * @constructor
 *
 */
export class WorkbookManager {
    private static instance: Workbook | null = null;
    private static activeSheet: string = "Sheet1";
    private static activeCell: string = "";

    /**
     * Returns the workbook.
     * If the workbook does not exist, it creates a new one.
     * @returns The workbook.
     * @constructor
     *
     */
    static getWorkbook(): Workbook {
        if (!this.instance) {
            this.instance = new Workbook();
            new Sheet(this.instance, "Sheet1", 65536, 1048576, true);
        }
        return this.instance;
    }

    /**
     * Returns the active sheet.
     * If the sheet does not exist, it returns nulls
     * @returns The active sheet.
     * @constructor
     *
     */
    static getActiveSheet(): Sheet | null {
        if (!this.instance || !this.activeSheet) {
            this.createNewWorkbook()
            console.log("[WorkbookManager] Creating Workbook");
        }
        return this.instance!.getSheet(this.activeSheet);
    }

    /**
     * Returns the active cell.
     * @returns The active cell.
     * @constructor
     *
     */
    static getActiveCell(): string | null {
        return this.activeCell;
    }

    /**
     * Sets the active cell.
     * @param cell The cell to be set as active.
     * @constructor
     *
     */
    static setActiveCell(cell: string): void {
        this.activeCell = cell;
    }

    /**
     * Returns the name of the active sheet.
     * @returns The name of the active sheet.
     * @constructor
     *
     */
    static getActiveSheetName(): string {
        return this.activeSheet;
    }

    /**
     * Sets the name of the active sheet.
     * @param activeSheetName The name of the active sheet.
     * @constructor
     *
     */
    static setActiveSheet(activeSheetName: string): void {
        this.activeSheet = activeSheetName;
    }

    /**
     * Creates a new workbook.
     * @constructor
     *
     */
    static createNewWorkbook(): void {
        this.instance = new Workbook();
    }

    /**
     * Returns the names of the sheets in the workbook.
     * @returns The names of the sheets in the workbook.
     * @constructor
     *
     */
    static getSheetNames(): string[] {
        if (!this.instance) {
            console.error("[WorkbookManager] getSheets() can't see a workbook.");
            return [];
        }
        let sheetNames: string[] = [];
        this.instance.GetSheets().forEach((sheet: Sheet) => {
            sheetNames.push(sheet.getName());
        })
        return sheetNames;
    }
}