import type { Sheet } from "./Sheet";
import { CyclicException, Formats } from "./Types";
import { FullCellAddress, SupportArea } from "./CellAddressing";
import { Cell, type Formula } from "./Cells";

// A Workbook is a collection of distinctly named Sheets.
export class Workbook {
    private readonly sheets: Sheet[] = new Array<Sheet>();
    public readonly format: Formats = new Formats();

    // For managing recalculation of the workbook
    private _Cyclic: CyclicException | null = null; // Non-null if workbook has cycle. Cyclic was public in C# but its set was private. To achieve the same behaviour in TypeScript, we made Cyclic private
    public _RecalcCount: number; // Number of recalculations done
    public _UseSupportSets: boolean;
    private readonly editedCells: FullCellAddress[] =
        new Array<FullCellAddress>(); // List
    private readonly volatileCells: Set<FullCellAddress> =
        new Set<FullCellAddress>(); // Contains the cell addresses of the volatile cells (that needs to be recalculated if the workbook is recalculated)
    private readonly awaitsEvaluation: FullCellAddress[] =
        new Array<FullCellAddress>(); // Queue!

    /**
     * Retrieve the cyclicException if it exists.
     * @constructor
     */
    get Cyclic(): CyclicException | null {
        return this._Cyclic;
    }

    /**
     * Set the cyclicException if it exists.
     * @param arg
     * @constructor
     */
    set Cyclic(arg: CyclicException | null) {
        this._Cyclic = arg;
    }

    /**
     * Gets number of recalculations done for this Workbook.
     * This is used for testing purposes.
     * @returns
     * @constructor
     */
    get RecalcCount(): number {
        return this._RecalcCount;
    }

    set RecalcCount(value: number) {
        this._RecalcCount = value;
    }

    get UseSupportSets(): boolean {
        return this._UseSupportSets;
    }

    set UseSupportSets(value: boolean) {
        this._UseSupportSets = value;
    }

    /**
     * Returns the sheets array. Used for testing.
     * @constructor
     */
    public GetSheets(): Sheet[] {
        return this.sheets;
    }

    /**
     * Returns the editedCells array. Used for testing.
     * @constructor
     */
    public GetEditedCells(): FullCellAddress[] {
        return this.editedCells;
    }

    /**
     * Returns the editedCells array. Used for testing.
     * @constructor
     */
    public GetVolatileCells(): Set<FullCellAddress> {
        return this.volatileCells;
    }

    /**
     * Returns the awaitsEvaluation array. Used for testing.
     * @constructor
     */
    public GetAwaitsEvaluation(): FullCellAddress[] {
        return this.awaitsEvaluation;
    }

    public constructor() {
        this._RecalcCount = 0;
        this._UseSupportSets = true;
    }

    /**
     * Adds a new sheet to the workbook.
     * @param sheet
     * @constructor
     */
    public AddSheet(sheet: Sheet): void {
        this.sheets.push(sheet);
    }

    /**
     * Records a cell change by pushing a new FullCellAddress onto the editedCells array.
     * @param col
     * @param row
     * @param sheet
     * @constructor
     */
    public RecordCellChange(col: number, row: number, sheet: Sheet): void {
        const fca = new FullCellAddress(sheet, null, col, row);
        this.editedCells.push(fca);
    }

    /**
     * Returns the sheet from the 'sheets' list with the same name or index as
     * the argument. Else, it returns null if that sheet doesn't exist.
     * @param name
     */
    public getSheet(name: string | number): Sheet | null {
        if (typeof name === "string") {
            name = name.toUpperCase();
            for (const sheet of this.sheets) {
                if (sheet.getName().toUpperCase() === name) {
                    return sheet;
                }
            }
        } else {
            name = name as number;
            return this.sheets[name];
        }
        return null;
    }

    /**
     * Recalculate from recalculation roots only, using their supported sets
     * @constructor
     */
    public Recalculate(): number {
        // Now Cyclic != null or for all formulas f, f.state==Uptodate
        return this.TimeRecalculation(() => {
            this.UseSupportSets = true;
            // Requires for all formulas f, f.state==Uptodate
            // Stage (1): Mark formulas reachable from roots, f.state=Dirty
            SupportArea.idempotentForeach = true;
            this.volatileCells.forEach((fca: FullCellAddress) => {
                Cell.MarkCellDirty(
                    fca.sheet,
                    fca.cellAddress.col,
                    fca.cellAddress.row,
                ); // When marking cells as "dirty" we mark them for recalculation.
            });
            this.editedCells.forEach((fca: FullCellAddress) => {
                Cell.MarkCellDirty(
                    fca.sheet,
                    fca.cellAddress.col,
                    fca.cellAddress.row,
                );
            });

            // Stage (2): Evaluate Dirty formulas (and Dirty cells they depend on)
            this.Clear("awaitsEvaluation");
            SupportArea.idempotentForeach = true;
            this.volatileCells.forEach((fca: FullCellAddress) => {
                Cell.EnqueueCellForEvaluation(
                    fca.sheet,
                    fca.cellAddress.col,
                    fca.cellAddress.row,
                );
            });

            this.editedCells.forEach((fca: FullCellAddress) => {
                Cell.EnqueueCellForEvaluation(
                    fca.sheet,
                    fca.cellAddress.col,
                    fca.cellAddress.row,
                );
            });

            while (this.awaitsEvaluation.length > 0) {
                this.awaitsEvaluation.shift()?.Eval(); // because the value returned by shift() could possibly be undefined we use optional chaining (?.) to safely return undefined instead of throwing an error.
            }
        });
    }

    /**
     * Mark all cells as dirty and subsequently recalculate them.
     * This is done for each sheet in the workbook.
     */
    public FullRecalculation(): number {
        return this.TimeRecalculation(() => {
            this.UseSupportSets = false;
            this.ResetCellState();
            // For all formulas f, f.state==Dirty
            this.sheets.forEach((sheet) => {
                sheet.RecalculateFull();
            });
            this.Cyclic = null; // After one Full Recalculation have been made, set Cyclic back to null, so we don't do a full recalculation on all standard minimal recalculations.
        });
    }

    /**
     * Add a cell to the awaitsEvaluation queue.
     * @param sheet
     * @param col
     * @param row
     * @constructor
     */
    public AddToQueue(sheet: Sheet, col: number, row: number) {
        this.awaitsEvaluation.push(new FullCellAddress(sheet, null, col, row));
    }

    /**
     * Timing, and handling of cyclic dependencies
     * @param act
     * @constructor
     * @private
     */
    private TimeRecalculation(act: () => void): number {
        this.Cyclic = null;
        this.RecalcCount++;
        const swBegin = performance.now(); // Alternative to C#'s stopwatch

        try {
            act(); // This runs Recalculate()
        } catch (exn) {
            console.log("BAD:", exn);
            if (exn instanceof RangeError) {
                // If the call stack gets to deep e.g. on an import we do a fill recalculation.
                return this.FullRecalculation();
            }
            if (exn instanceof CyclicException) {
                this.Cyclic = exn as CyclicException;
            }
        }

        const swStop = performance.now();
        this.Clear("editedCells"); // This might be throwing an error
        return swStop - swBegin;
    }

    private ResetCellState(): void {
        this.sheets.forEach((sheet: Sheet) => {
            sheet.ResetCellState();
        });
    }

    /**
     * Used to rebuild workbook with support graph.
     * Not implemented in TypeCalc.
     * @constructor
     */
    public RebuildSupportGraph(): void {
        // For each sheet in sheets and for all cells in each sheet: call ResetSupportSet() from Cells.ts which sets the SupportSet to null.
        for (const sheet of this.sheets) {
            sheet.getCells().Forall((c, r, cell) => {
                cell.ResetSupportSet();
            });
        }
        this.ResetCellState(); // Mark all cells Dirty i.e. not Visited
        for (const sheet of this.sheets) {
            sheet.AddToSupportSets();
        } // Leaves all cells Dirty
    }

    /**
     * Clear VolatileSet
     * @constructor
     */
    public ResetVolatileSet(): void {
        this.Clear("volatileCells");
        for (const sheet of this.sheets) {
            sheet.IncreaseVolatileSet();
        }
    }

    public IncreaseVolatileSet(
        newCell: Cell,
        sheet: Sheet,
        col: number,
        row: number,
    ) {
        if (newCell != null && newCell.IsVolatile()) {
            this.volatileCells.add(
                new FullCellAddress(sheet, null, col as number, row),
            );
        }
    }

    public DecreaseVolatileSet(
        oldCell: Cell,
        sheet: Sheet,
        col: number,
        row: number,
    ) {
        const f: Formula = oldCell as unknown as Formula;
        if (f != null) {
            this.volatileCells.delete(
                new FullCellAddress(sheet, null, col, row),
            );
        }
    }

    public get SheetCount(): number {
        return this.sheets.length;
    }

    *[Symbol.iterator](): IterableIterator<Sheet> {
        for (const sheet of this.sheets) {
            yield sheet;
        }
    }

    /**
     * Method for clearing sheets, editedCells, volatileCells, or awaitsEvaluation arrays.
     */
    public Clear(name: string): void {
        if (name === "sheets") {
            this.sheets.length = 0;
        } else if (name === "editedCells") {
            this.editedCells.length = 0;
        } else if (name === "volatileCells") {
            this.volatileCells.clear();
        } else if (name === "awaitsEvaluation") {
            this.awaitsEvaluation.length = 0;
        }
    }
}
