import { Cell, CellState } from "../Cells";
import { Workbook } from "../Workbook";
import { Expr } from "../Expressions";
import { Value } from "../Value";
import { Sheet } from "../Sheet";
import { Adjusted, FullCellAddress, SuperCellAddress } from "../CellAddressing";
import { Formats } from "../Types";
import { ArrayValue } from "../ArrayValue";
import { ErrorValue } from "../ErrorValue";

/**
 * @file This file contains the Formula, ArrayFormula, and CachedArrayFormula classes
 * These classes are subclasses of cells, and are essentially ways of handling cell formulas,
 * both individually and as part of an array
 */

/**
 * A Formula is a non-null caching expression contained in a single cell
 * It extends upon the cell abstract class.
 */
export class Formula extends Cell {
    public readonly workbook: Workbook;
    private e: Expr;
    public state: CellState;
    private v: Value;

    constructor(workbook: Workbook, e: Expr) {
        super();
        this.workbook = workbook;
        this.e = e;
        this.state = CellState.Uptodate;
    }

    public static Make(workbook: Workbook, e: Expr): Formula | null {
        if (e == null) {
            return null;
        } else {
            return new Formula(workbook, e);
        }
    }

    /**
     * TODO: This is an issue with this current implementation
     * Moves a single cell containing a formula
     * The values that are used in this method is the delta values,
     * as such we need have the offset between the original formula and it new location.
     *
     */
    public override MoveContents(deltaCol: number, deltaRow: number): Cell {
        return new Formula(this.workbook, this.e.Move(deltaCol, deltaRow));
    }

    /**
     * Evaluates the cell's expression and caches it value.
     * @param sheet - sheet the cell is on
     * @param col - its X col
     * @param row - its Y row
     * @constructor
     */
    public override Eval(sheet: Sheet, col: number, row: number): Value {
        switch (this.state) {
            case CellState.Uptodate:
                break;
            case CellState.Computing:
                const culprit: FullCellAddress = new FullCellAddress(sheet, null, col, row);
                const msg = `### CYCLE in cell ${culprit} formula ${this.Show(col, row, this.workbook.format)} `;
                throw new Error(msg); // Culprit should be added to this.

            case CellState.Dirty:
            case CellState.Enqueued:
                this.state = CellState.Computing;
                this.v = this.e.Eval(sheet, col, row);
                if (this.workbook.UseSupportSets) {
                    this.ForEachSupported(this.EnqueueForEvaluation);
                    break;
                }
        }
        return this.v;
    }

    /**
     * This inserts a new row or column depending on the doRows value.
     * This command is relevant when a new column is created near an existing formula.
     * @param adjusted
     * @param modSheet
     * @param thisSheet
     * @param R
     * @param N
     * @param r
     * @param doRows
     * @constructor
     */
    public override InsertRowCols(adjusted: Map<Expr, Adjusted<Expr>>, modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean) {
        let ae: Adjusted<Expr>;
        if (adjusted.ContainsKey(this.e) && r < adjusted[e].upper) {
            ae = adjusted[e];
        } else {
            ae = this.e.InsertRowCols(modSheet, thisSheet, R, N, r, doRows);
            console.log("Making new adjusted at rowcol " + r + "; upper = " + ae.upper);
            if (ae.same) {
                ae = new Adjusted<Expr>(this.e, ae.upper, ae.same);
                console.log("Reusing expression");
            }
            adjusted[this.e] = ae;
        }
        this.e = ae.e;
    }

    /**
     * Returns the cached value that is the result of this formula
     * @constructor
     */
    public get Cached(): Value {
        return this.v;
    }

    /**
     * Marks a formula cell dirty
     * Not much to comment on
     * @constructor
     */
    public override MarkDirty() {
        if (this.state != CellState.Dirty) {
            this.state = CellState.Dirty;
            this.ForEachSupported(this.MarkDirty);
        }
    }

    /**
     * Adds the current formula cell to the evaluation queue structure in workbook
     * @param sheet
     * @param col
     * @param row
     * @constructor
     */

    public override EnqueueForEvaluation(sheet: Sheet, col: number, row: number) {
        if (this.state == CellState.Dirty) {
            this.state = CellState.Enqueued;
            sheet.workbook.AddToQueue(sheet, col, row);
        }
    }

    public override AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number) {
        this.e.AddToSupportSets(supported, col, rows, cols);
    }

    public override RemoveFromSupportSets(sheet: Sheet, col: number, row: number) {
        this.e.RemoveFromSupportSets(sheet, col, row);
    }

    /**
     * Sets the formula cell to be in a dirty state!
     * @constructor
     */
    public override Reset() {
        this.state = CellState.Dirty;
    }

    public override ForEachReferred(sheet: Sheet, col: number, row: number, act: (addr: FullCellAddress) => void) {
        this.e.ForEachReferred(sheet, col, row, act);
    }

    /**
     * Clone this cell formula onto another cell
     * @param col
     * @param row
     * @constructor
     */
    public override CloneCell(col: number, row: number): Cell {
        return new Formula(this.workbook, this.e.CopyTo(col, row));
    }

    /**
     * Returns whether the formula contains any volatile values
     * @constructor
     */
    public override IsVolatile(): boolean {
        return this.e.IsVolatile;
    }

    public override DependsOn(here: FullCellAddress, dependsOn: FullCellAddress) {
        this.e.DependsOn(here, dependsOn);
    }
    // this does not need parameters?
    public override showValue(): string {
        return this.v != null ? this.v.toString() : "";
    }

    /**
     * Displays the value of the formula cell
     * @param col
     * @param row
     * @param fo
     * @constructor
     */
    public override Show(col: number, row: number, fo: Formats): string {
        return "=" + this.e.show(col, row, 0, fo);
    }

    public get Expr(): Expr {
        return this.e;
    }

    public set Visited(value: boolean) {
        this.state = value ? CellState.Uptodate : CellState.Dirty;
    }
    public get Visited(): boolean {
        return this.state == CellState.Uptodate;
    }
}

export class ArrayFormula extends Cell {
    public readonly caf: CachedArrayFormula;
    private readonly ca: SuperCellAddress;

    constructor(caf: CachedArrayFormula, ca: SuperCellAddress);
    constructor(caf: CachedArrayFormula, col: number, row: number);

    constructor(caf: CachedArrayFormula, col: number | SuperCellAddress, row?: number) {
        super();
        this.caf = caf;
        if (row) {
            this.ca = new SuperCellAddress(col as number, row);
        } else {
            this.ca = col as SuperCellAddress;
        }
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value | null {
        const v: Value = this.caf.Eval();
        if (v instanceof ArrayValue) {
            return (v as ArrayValue).get(this.ca);
        } else if (v instanceof ErrorValue) {
            return v;
        } else {
            return ErrorValue.Make("#ERR: Not Array");
        }
    }

    public Contains(col: number, row: number): boolean {
        return this.caf.ulCa.col <= col && col <= this.caf.lrCa.col && this.caf.ulCa.row <= row && row <= this.caf.lrCa.row;
    }

    // TODO: contains an issue that can be looked into!
    public override MoveContents(deltaCol: number, deltaRow: number): Cell {
        return new ArrayFormula(this.caf.MoveContents(deltaCol, deltaRow), this.ca);
    }

    // TODO: This is not implemented at all in the sestoft version!
    public override InsertRowCols(
        adjusted: Map<Expr, Adjusted<Expr>>,
        modSheet: Sheet,
        thisSheet: boolean,
        R: number,
        N: number,
        r: number,
        doRows: boolean,
    ): void {
        throw new Error("Not implemented :)");
    }

    public override showValue(sheet: Sheet, col: number, row: number): string {
        const v: Value = this.caf.CachedArray;
        if (v instanceof ArrayValue) {
            const element: Value = (v as ArrayValue).get(this.ca);
            return element != null ? element.toString() : "";
        } else if (v instanceof ErrorValue) {
            return v.ToString();
        } else {
            return ErrorValue.Make("#ERR: Not array").toString();
        }
    }

    public override MarkDirty(): void {
        switch (this.caf.formula.state) {
            case CellState.Uptodate:
                this.caf.formula.MarkDirty();
                this.ForEachSupported(this.MarkDirty); // weird recursion?
                break;
            case CellState.Dirty:
                this.ForEachSupported(this.MarkDirty);
                break;
        }
    }

    public override EnqueueForEvaluation(sheet: Sheet, col: number, row: number): void {
        switch (this.caf.formula.state) {
            case CellState.Dirty:
                this.caf.Eval();
                this.ForEachSupported(this.EnqueueForEvaluation);
                break;
            case CellState.Uptodate:
                this.ForEachSupported(this.EnqueueForEvaluation);
                break;
        }
    }

    public override Reset(): void {
        this.caf.formula.Reset();
    }

    public override ResetSupportSet() {
        this.caf.ResetSupportSet();
        super.ResetSupportSet();
    }

    public override AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number): void {
        this.caf.UpdateSupport(supported);
    }

    public override RemoveFromSupportSets(sheet: Sheet, col: number, row: number): void {
        this.caf.RemoveFromSupportSet(sheet, col, row);
    }

    public override ForEachReferred(sheet: Sheet, col: number, row: number, act: (addr: FullCellAddress) => void): void {
        this.caf.ForEachReferred(act);
    }

    /**
     * TODO: IMPLEMENT THIS
     * @param col
     * @param row
     * @constructor
     */
    public override CloneCell(col: number, row: number): Cell {
        throw new Error("NotImplementedException");
    }

    public override IsVolatile(): boolean {
        return this.caf.formula.IsVolatile();
    }

    public override DependsOn(here: FullCellAddress, dependsOn: FullCellAddress): void {
        this.caf.formula.DependsOn(here, dependsOn);
    }

    public override Show(col: number, row: number, fo: Formats): string {
        return "{" + this.caf.Show(this.caf.formulaCol, this.caf.formulaRow, fo) + "}";
    }
}

export class CachedArrayFormula {
    public readonly formula: Formula;
    public readonly sheet: Sheet;
    public readonly formulaCol: number;
    public readonly formulaRow: number;
    public readonly ulCa: SuperCellAddress;
    public readonly lrCa: SuperCellAddress;
    private supportAdded: boolean;
    private supportRemoved: boolean;

    constructor(formula: Formula, sheet: Sheet, formulaCol: number, formulaRow: number, ulCa: SuperCellAddress, lrCa: SuperCellAddress) {
        this.formula = formula;
        this.sheet = sheet;
        this.formulaCol = formulaCol;
        this.formulaRow = formulaRow;
        this.ulCa = ulCa;
        this.lrCa = lrCa;
        this.supportAdded = this.supportRemoved = false;
    }

    /**
     * Uses the formulas evaluation function to return a value
     * @see formula#Eval
     * @constructor
     */
    public Eval(): Value {
        return this.formula.Eval(this.sheet, this.formulaCol, this.formulaRow);
    }

    public MoveContents(deltaCol: number, deltaRow: number): CachedArrayFormula {
        return new CachedArrayFormula(
            this.formula.MoveContents(deltaCol, deltaRow) as Formula,
            this.sheet,
            this.formulaCol,
            this.formulaCol,
            this.ulCa,
            this.lrCa,
        );
    }

    public get CachedArray(): Value {
        return this.formula.Cached;
    }

    public ResetSupportSet(): void {
        this.supportAdded = false;
    }

    public UpdateSupport(supported: Sheet) {
        if (!this.supportAdded) {
            this.formula.AddToSupportSets(supported, this.formulaCol, this.formulaRow, 1, 1);
            this.supportAdded = true;
        }
    }

    public RemoveFromSupportSet(sheet: Sheet, col: number, row: number) {
        if (!this.supportRemoved) {
            this.formula.RemoveFromSupportSets(sheet, col, row);
            this.supportRemoved = true;
        }
    }

    public ForEachReferred(act: (addr: FullCellAddress) => void): void {
        this.formula.ForEachReferred(this.sheet, this.formulaCol, this.formulaRow, act);
    }

    public Show(col: number, row: number, fo: Formats): string {
        return this.formula.Show(col, row, fo);
    }
}
