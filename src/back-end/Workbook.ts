import type { Sheet } from "./Sheet";
import { CyclicException, Formats } from "./Types";
import { FullCellAddress, SupportArea } from "./CellAddressing";
import { Cell, type Formula } from "./Cells";

// A Workbook is a collection of distinct named Sheets.
export class Workbook {
    // public OnFunctionsAltered: (functions: string[]) => void; // We skip this field for now since it seems to be for FunCalc

    private readonly sheets: Sheet[] = new Array<Sheet>();
    public readonly format: Formats = new Formats();

    // For managing recalculation of the workbook
    private _Cyclic: CyclicException | null = null; // Non-null if workbook has cycle. Cyclic was public in C# but its set was private. To achieve the same behaviour in TypeScript, we made Cyclic private
    public _RecalcCount: number; // Number of recalculations done
    public _UseSupportSets: boolean;
    private readonly editedCells: FullCellAddress[] = new Array<FullCellAddress>(); // List
    private readonly volatileCells: Set<FullCellAddress> = new Set<FullCellAddress>(); // Contains the cell addresses of the volatile cells (that needs to be recalculated if the workbook is recalculated)
    private readonly awaitsEvaluation: FullCellAddress[] = new Array<FullCellAddress>(); // Queue!

    get Cyclic(): CyclicException | null {
        return this._Cyclic;
    }

    set Cyclic(arg: CyclicException | null) {
        this._Cyclic = arg;
    }

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
    public GetEditedCells(): FullCellAddress[]{
        return this.editedCells;
    }

    /**
     * Returns the editedCells array. Used for testing.
     * @constructor
     */
    public GetVolatileCells(): Set<FullCellAddress>{
        return this.volatileCells;
    }

    /**
     * Returns the awaitsEvaluation array. Used for testing.
     * @constructor
     */
    public GetAwaitsEvaluation(): FullCellAddress[]{
        return this.awaitsEvaluation;
    }



    public constructor() {
        this._RecalcCount = 0;
        this._UseSupportSets = false;
    }

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
    public get(name: string | number): Sheet | null {
        if (typeof name === "string") {
            name = name.toUpperCase();
            for(const sheet of this.sheets) {
                if(sheet.getName().toUpperCase() === name) {
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
            this.volatileCells.forEach(fca => {
                Cell.MarkCellDirty(fca.sheet, fca.cellAddress.col, fca.cellAddress.row); // When marking cells as "dirty" we mark them for recalculation.
            });
            this.editedCells.forEach(fca => {
                Cell.MarkCellDirty(fca.sheet, fca.cellAddress.col, fca.cellAddress.row);
            })

            // Stage (2): Evaluate Dirty formulas (and Dirty cells they depend on)
            this.Clear("awaitsEvaluation");
            SupportArea.idempotentForeach = true;
            this.volatileCells.forEach(fca => {
                Cell.EnqueueCellForEvaluation(fca.sheet, fca.cellAddress.col, fca.cellAddress.row);
            });

            this.editedCells.forEach(fca => {
                Cell.EnqueueCellForEvaluation(fca.sheet, fca.cellAddress.col, fca.cellAddress.row);
            });

            while (this.awaitsEvaluation.length > 0) {
                this.awaitsEvaluation.shift()?.Eval() // because the value returned by shift() could possibly be undefined we use optional chaining (?.) to safely return undefined instead of throwing an error.
                // We know for a fact that the error isn't empty since we have checked if length > 0 but typescript isn't satisfied with this because the array might be modified between checking .length > 0 and calling shift().
            }
        });
    }

    /**
     * This method listens
     * @private
     * (Probably only used for FunCalc)
     */
    //private onFunctionsAltered(listener: (functions: string[]) => void): void {
    //    this.addEventListener("functionsAltered", (event: Event) => {
    //        const functions = (event as CustomEvent<string[]>).detail;
    //        listener(functions);
    //    });
    //}

    public AddToQueue(sheet: Sheet, col: number, row: number) {
        this.awaitsEvaluation.push(new FullCellAddress(sheet, null, col, row));
    }

    // TODO: RecalculateFull() (NB: We probably don't have to make this since it's FunCalc related)

    // TODO: RecalculateFullAfterSdfCheck() (NB: We probably don't have to make this since it's FunCalc related)

    // TODO: RecalculateFullRebuild() (NB: We probably don't have to make this since it's FunCalc related)

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
            this.ResetCellState(); // This might be throwing an error
            if (exn instanceof CyclicException) {
                this.Cyclic = exn;
            } else {
                console.log("BAD:", exn);
            }
        }

        const swStop = performance.now();
        this.Clear("editedCells"); // This might be throwing an error
        return swStop - swBegin;
    }


    // TODO: CheckForModifiedSdf() (NB: We probably don't have to make this since it's FunCalc related)

    private ResetCellState(): void {
        this.sheets.forEach((sheet: Sheet) => {
            sheet.ResetCellState();
        });
    }

    public RebuildSupportGraph(): void {
        console.log("Rebuilding support graph");
        // For each sheet in sheets and for all cells in each sheet: call ResetSupportSet() from Cells.ts which sets the SupportSet to null.
        for(const sheet of this.sheets) {
            sheet.getCells().Forall((c, r, cell) => {
                cell.ResetSupportSet();
            });
        }
        this.ResetCellState(); // Mark all cells Dirty i.e. not Visited
        for(const sheet of this.sheets) {
            sheet.AddToSupportSets();
        } // Leaves all cells Dirty
    }

    public ResetVolatileSet(): void {
        this.Clear("volatileCells");
        for(const sheet of this.sheets) {
            sheet.IncreaseVolatileSet();
        }
    }

    public IncreaseVolatileSet(newCell: Cell, sheet: Sheet, col: number, row: number) {
        if (newCell != null && newCell.IsVolatile()) {
            this.volatileCells.add(new FullCellAddress(sheet, null, col as number, row));
        }
    }

    public DecreaseVolatileSet(oldCell: Cell, sheet: Sheet, col: number, row: number) {
        const f: Formula = oldCell as unknown as Formula;
        if (f != null) {
            this.volatileCells.delete(new FullCellAddress(sheet, null, col, row));
        }
    }

    public SheetCount(): number {
        return this.sheets.length;
    }

    *[Symbol.iterator](): IterableIterator<Sheet> {
        for (const sheet of this.sheets) {
            yield sheet;
        }
    }


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
