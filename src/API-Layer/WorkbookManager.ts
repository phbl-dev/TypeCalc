//This is an overarching workbook used for all objects in the system.
//Follows a singleton dogma, since we really never need to have multiple workbooks at the same time.
import {Workbook} from "../back-end/Workbook.ts";
import {Sheet} from "../back-end/Sheet.ts";

export class WorkbookManager {
    private static instance: Workbook | null = null;
    private static activeSheet: string = "Sheet1";
    private static activeCell: string = "";

    static getWorkbook(): Workbook {
        if (!this.instance) {
            this.instance = new Workbook();
            const baseSheet: Sheet = new Sheet(this.instance, "Sheet1", 65536, 1048576, true);
            this.instance.AddSheet(baseSheet);
        }
        return this.instance;
    }

    static getActiveSheet(): Sheet | null {
        if (!this.instance || !this.activeSheet) {
            this.instance = new Workbook();
            console.log("[WorkbookManager] Creating Workbook");
        }
        return this.instance.get(this.activeSheet);
    }

    static getActiveCell(): string | null {
        return this.activeCell;
    }

    static setActiveCell(cell: string): void {
        this.activeCell = cell;
    }

    //static addSheet(sheetName:string):void {}

    static getActiveSheetName(): string {
        return this.activeSheet;
    }

    static setActiveSheet(activeSheetName: string): void {
        this.activeSheet = activeSheetName;
    }

    static createNewWorkbook(): void {
        this.instance = new Workbook();
    }

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