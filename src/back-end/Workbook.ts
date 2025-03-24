import { Sheet } from "./Sheet";
import { Formats } from "./Types";
import { FullCellAddress } from "./CellAddressing";
import { Cell } from "./Cells";

export class Workbook extends EventTarget {
    private readonly sheets: Sheet[] = new Array<Sheet>();
    public readonly format: Formats = new Formats();
    public _RecalcCount: number;
    private _UseSupportSets: boolean;
    private readonly editedCells: FullCellAddress[] = new Array<FullCellAddress>(); // List
    private readonly volatileCells: Set<FullCellAddress> = new Set<FullCellAddress>();
    private readonly awaitsEvaluation: FullCellAddress[] = new Array<FullCellAddress>(); // Queue!

    get RecalcCount() {
        return this._RecalcCount;
    }

    set RecalcCount(value) {
        this._RecalcCount = value;
    }

    get UseSupportSets(): boolean {
        return this._UseSupportSets;
    }

    set UseSupportSets(value: boolean) {
        this._UseSupportSets = value;
    }

    /**
     * This method listens
     * @param listener
     * @private
     */
    private onFunctionsAltered(listener: (functions: string[]) => void): void {
        this.addEventListener("functionsAltered", (event: Event) => {
            const functions = (event as CustomEvent<string[]>).detail;
            listener(functions);
        });
    }

    public alterFunctions(act: string[]): void {
        this.dispatchEvent(new CustomEvent("functionsAltered", { detail: act }));
    }

    public constructor() {
        super();
        this._RecalcCount = 0;
        this._UseSupportSets = false;
    }

    public AddSheet(sheet: Sheet): void {
        this.sheets.push(sheet);
    }

    public RecordCellChange(col: number, row: number, sheet: Sheet): void {
        this.editedCells.push(new FullCellAddress(sheet, null, col, row));
    }

    public get(name: string | number): Sheet | null {
        if (typeof name === "string") {
            name = name.toUpperCase();
            for (const sheet of this.sheets) {
                if (sheet.getName().toUpperCase() === name) {
                    console.log("MATCH FOUND");
                    return sheet;
                }
            }
        } else {
            return this.sheets[name];
        }
        return null;
    }

    public AddToQueue(sheet: Sheet, col: number, row: number) {
        this.awaitsEvaluation.unshift(new FullCellAddress(sheet, null, col, row));
    }

    public Clear(): void {
        this.sheets.length = 0;
        this.editedCells.length = 0;
    }

    // TODO: RecalculateFull()

    // TODO: RecalculateFullAfterSdfCheck()

    // TODO: RecalculateFullRebuild()

    // TODO: TimeRecalculation()

    // TODO: CheckForModifiedSdf()

    private ResetCellState(): void {
        this.sheets.forEach((sheet: Sheet) => {
            sheet.ResetCellState();
        });
    }

    public IncreaseVolatileSet(newCell: Cell, sheet: Sheet, col: number, row: number) {
        if (newCell != null && newCell.IsVolatile()) {
            this.volatileCells.add(new FullCellAddress(sheet, null, col as number, row));
        }
    }

    public DecreaseVolatileSet(oldCell: Cell, sheet: Sheet, col: number, row: number) {
        this.volatileCells.delete(new FullCellAddress(sheet, null, col, row));
    }

    *[Symbol.iterator](): IterableIterator<Sheet> {
        for (const sheet of this.sheets) {
            yield sheet;
        }
    }
}
