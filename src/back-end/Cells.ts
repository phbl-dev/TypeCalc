// All the files from the old Cells folder has been moved here to avoid cyclic dependencies.
import type { Sheet } from "./Sheet";
import type { Value } from "./Value";
import { Adjusted,  FullCellAddress, type Interval, SupportSet, SuperCellAddress } from "./CellAddressing";
import { Error, type Expr, NumberConst } from "./Expressions"; // This should be imported when it's done
import { CyclicException, Formats } from "./Types";
import type { Workbook } from "./Workbook"; // This should be imported when it's done
import { SpreadsheetVisitor} from "./Parser/Visitor";
import { NumberValue } from "./NumberValue";
import { TextValue } from "./TextValue";
import { ArrayValue } from "./ArrayValue";
import { ErrorValue } from "./ErrorValue";
import { N } from "@formulajs/formulajs";



export enum CellState {
    Dirty = 0,
    Enqueued = 1,
    Computing = 2,
    Uptodate = 3,
}

// The Cell class and its subclasses represent the possible contents
// of a spreadsheet cell.
export abstract class Cell {
    private supportSet: SupportSet | null = null;

    // Method made for testing:
    public GetSupportSet(): SupportSet | null {
        return this.supportSet;
    }

    /*
    The abstract Eval() method is used for evaluating the contents of a cell and returning the value. It has
    three parameters which specify which cell should be evaluated:
    - sheet: Sheet
    - col: number
    - row: number

    In a TextCell, QuoteCell, and NumberCell the method will be overwritten and just return the value of the cell
    without any further computation.

    In Formula, ArrayFormula, and CachedArrayFormula the method is overwritten but further computation is added
    before the method can return a valid value.
     */
    public abstract Eval(sheet: Sheet, col: number, row: number): Value | null;

    /*
    The overall purpose of the abstract MoveContents() method is to move a cell or a gathering of cells
    (an array formula) by the number of rows and columns given as arguments. The functionality depends on
    how it is being overwritten for the specific type of cell (e.g. a single cell, a formula, or an array formula)

    The direction of where the contents are moved depends on the values we give as arguments for the parameters
    deltaCol and deltaRow. For example:
    - (0,-1): north (up)
    - (0,1): south
    - (1,0): east
    - (-1,0): west
    - (1,1): south-east
    - (-1,1): south-west
    - (-1,-1): north-west
    - (1,-1): north-east
     */
    public abstract MoveContents(deltaCol: number, deltaRow: number): Cell;

    /*
    The abstract method InsertRowCols() handles the case where a row or column is inserted and this affects
    the references of one or more cells. This method is only important to override in the FormulaClass
    because formulas may depend on cell references. When a formula depends on the references of other cells,
    then it is important that we update the formula to contain the correct references after the insertion of
    a new row/column. In other types of cells (e.g. ConstCell, NumberCell, QuoteCell) that don't contain a
    formula, we don't need to apply InsertRowCols().
     */
    public abstract InsertRowCols(
        adjusted: Map<Expr, Adjusted<Expr>>,
        modSheet: Sheet,
        thisSheet: boolean,
        R: number,
        N: number,
        r: number,
        doRows: boolean,
    ): void;

    /*
    The abstract method Reset() is used to clear flags, cached values and formula dependencies (references to other cells)
    when the contents of a cell are modified or deleted. It is primarily implemented in Formula, ArrayFormula,
    and CachedArrayFormula to ensure that outdated computations and references are removed.
     */
    public abstract Reset(): void;

    // Mark the cell dirty, for subsequent evaluation
    public abstract MarkDirty(): void;

    public static MarkCellDirty(sheet: Sheet, col: number, row: number): void {
        const cell: Cell | null = sheet.Get(col, row); // get doesn't exist yet in Sheet class
        if (cell != null) {
            cell.MarkDirty();
        }
    }

    // Enqueue this cell for evaluation
    public abstract EnqueueForEvaluation(sheet: Sheet, col: number, row: number): void;

    public static EnqueueCellForEvaluation(sheet: Sheet, col: number, row: number): void {
        const cell: Cell | null = sheet.Get(col, row); // get doesn't exist yet in Sheet class
        if (cell != null) {
            cell.EnqueueForEvaluation(sheet, col, row); // Add if not already added, etc
        }
    }

    /*
    The showValue() method calls the Eval function to evaluate the value of the cell and then returns this value as a string.
    If the value is null then an empty string is returned.

    It has three parameters which specify which cell should be evaluated:
    - sheet: Sheet
    - col: number
    - row: number
     */
    public showValue(sheet: Sheet, col: number, row: number): string {
        const v: Value | null = this.Eval(sheet, col, row);
        if (v != null) {
            return JSON.stringify(v);
        } else return "";
    }

    /*
    The purpose of the abstract Show() method is to return the formula of a cell as a string.
    For example if we have a cell with the formula SUM(A1, B1) then "SUM(A1, B1)" would be
    returned by Show(). The method has three parameters:
    - col: number
    - row: number
    - fo: Formats
    col and row gives the location of the cell and fo gives the format of the spreadsheet which
    may differ (e.g. SUM(A1, B1) and SUM(R1C1, R1C1) which are the same)
     */
    public abstract Show(col: number, row: number, fo: Formats): string;

    /*
    The Parse() method takes four parameters:
    - text: string - The text that will be parsed into a Cell
    - workbook: Workbook - We likely give this because parseCell() needs it. Maybe for retrieving references of cells in other sheets of that workbook.
    - col: number - The column where the cell is meant to be when it's inserted.
    - row: number - The row where the cell is meant to be when it's inserted.

    And then parses the text argument into a Cell object and returns this Cell.
     */
    public static Parse(text: string, workbook: Workbook, col: number, row: number): Cell | null {
        if (text) {


            const parser: SpreadsheetVisitor = new SpreadsheetVisitor();
            console.log("this is what is being returned from Cell: ", parser.ParseCell(text,workbook, col, row))
            return parser.ParseCell(text,workbook, col, row); // We call the parseCell() method to return a readable Cell.
        } else return null;
    }

    // Add the support range to the cell, avoiding direct self-support at sheet[col,row]
    public AddSupport(sheet: Sheet, col: number, row: number, suppSheet: Sheet, suppCols: Interval, suppRows: Interval): void {
        if (this.supportSet === null) {
            this.supportSet = new SupportSet();
            this.supportSet.addSupport(sheet, col, row, suppSheet, suppCols, suppRows);
        }
    }

    // Remove sheet[col,row] from the support sets of cells that this cell refers to
    public abstract RemoveFromSupportSets(sheet: Sheet, col: number, row: number): void;

    // Remove sheet[col,row] from this cell's support set
    public RemoveSupportFor(sheet: Sheet, col: number, row: number): void {
        if (this.supportSet !== null) {
            this.supportSet.removeCell(sheet, col, row);
        }
    }

    /*
     Old comment: Overridden in ArrayFormula?
     The ForEachSupported() method applies the given function (act) to each element in supportSet.
     */
    public ForEachSupported(act: (sheet: Sheet, col: number, row: number) => void): void {
        if (this.supportSet !== null) {
            this.supportSet.forEachSupported(act);
        }
    }

    /*
    Old comment: Use at manual cell update, and only if the oldCell is never used again
    IMPORTANT: Note that the old method in C# held a reference to the newCell such that it was automatically
    updated when changed. Since TypeScript doesn't allow that we instead return the newCell and leave it
    up to the method caller to manually updated their newCell argument.
     */
    public TransferSupportTo(newCell: Cell | null): Cell {
        if (this.supportSet !== null) {
            // ?? returns the right-hand value (new BlankCell()) only if the left-hand value (newCell) is null or undefined.
            // Otherwise, it returns the left-hand value. Therefore, newCell cannot be null after this operation.
            newCell = newCell ?? new BlankCell();
            newCell!.supportSet = this.supportSet; // We use ! to guarantee TypeScript that newCell is not null.
        }
        // We can't just return newCell because Typescript thinks it can still be null. Therefore, we check again that
        // it's not null before returning it. If it's null we return a new BlankCell.
        return newCell ?? new BlankCell();
    }

    // Add to support sets of all cells referred to from this cell, when
    // the cell appears in the block supported[col..col+cols-1, row..row+rows-1]
    public AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number): void {}

    // Clear the cell's support set; in ArrayFormula also clear the supportSetUpdated flag
    public ResetSupportSet(): void {
        this.supportSet = null;
    }

    public abstract ForEachReferred(sheet: Sheet, col: number, row: number, act: (addr: FullCellAddress) => void): void;

    // True if the expression in the cell is volatile
    public abstract IsVolatile(): boolean;

    // Clone cell (supportSet, state fields) but not its sharable contents
    public abstract CloneCell(col: number, row: number): Cell;

    /*
    The abstract DependsOn() method is used to register the dependency of a current cell (here) and
    the other cells that it depends on (dependsOn).
     */
    public abstract DependsOn(here: FullCellAddress, dependsOn: (fullCellAddr: FullCellAddress) => void): void;
}
// A ConstCell is a cell that contains a constant only.
// In contrast to general cells, it is immutable and can be shared
export abstract class ConstCell extends Cell {
    //The MoveContents() overrides the original method and returns the object as a Cell.

    public override AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number) {}

    public override RemoveFromSupportSets(sheet: Sheet, col: number, row: number) {}

    public override ForEachReferred(sheet: Sheet, col: number, row: number, act: (addr: FullCellAddress) => void) {}

    public override MarkDirty(): void {
        this.ForEachSupported(ConstCell.MarkCellDirty);
    }

    public override EnqueueForEvaluation(sheet: Sheet, col: number, row: number) {
        this.ForEachSupported(this.EnqueueForEvaluation);
    }

    public override MoveContents(deltaCol: number, deltaRow: number): Cell {
        return this;
    }

    public override IsVolatile(): boolean {
        return false;
    }

    public override InsertRowCols(
        adjusted: Map<Expr, Adjusted<Expr>>,
        modSheet: Sheet,
        thisSheet: boolean,
        R: number,
        N: number,
        r: number,
        doRows: boolean,
    ): void {}

    public override Reset(): void {}

    public override DependsOn(here: FullCellAddress, dependsOn: (fullCellAddr: FullCellAddress) => void): void {}
}

/*
    A BlankCell is a blank cell, used only to record a blank cell's support set.
 */
export class BlankCell extends ConstCell {

    constructor() {
        super();
    }
    public override Eval(sheet: Sheet, col: number, row: number): Value | null {
        console.log(sheet, col, row);
        return null;
    }

    public override Show(col: number, row: number, fo: Formats): string {
        console.log(col, row, fo);

        return ""
    }

    public override CloneCell(col: number, row: number): Cell {
        console.log(col, row);

        return new BlankCell();
    }

    Reset(): void {
        throw new Error("Method not implemented.");
    }


}

export class NumberCell extends ConstCell {
    public readonly value: NumberValue; // Non-null

    /**
     Since we cannot have multiple constructors in TypeScript, we have created a constructor that
     either:
     - sets value to be a new NumberValue instance if d is a number,
     - or sets value to be the value of d if d is already a NumberCell.
     */
    constructor(d: number | NumberCell) {
        super();
        if (typeof d === "number") {
            if (Number.isNaN(d) || !isFinite(d)) {
                // Check if d is "not a number" or is infinite.
                throw new Error(`${d} is not a valid number`);
            }
            this.value = NumberValue.Make(d) as NumberValue; // Because NumberValue.Make(d) returns a Value we cast it as a NumberValue.
        } else {
            this.value = d.value;
        }
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, fo: Formats): string {
        return this.value.ToString();
    }

    public override CloneCell(col: number, row: number): Cell {
        return new NumberCell(this);
    }

    // We have to implement these methods from the ConstCell as well:
    Reset(): void {
        throw new Error("Method not implemented.");
    }

}


export class QuoteCell extends ConstCell {
    public readonly value: TextValue;

    constructor(argument: string | QuoteCell) {
        super();
        if (argument instanceof QuoteCell) {
            this.value = argument.value;
        } else {
            console.assert(argument !== null); // If the argument is null we get a warning but the execution is not stopped.
            this.value = TextValue.Make(argument);
        }
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, fo: Formats): string {
        return "'" + this.value.value; // not just the TextValue but the value of the TextValue which gives us an actual string.
        // Question: Why add "'"?
    }

    public override CloneCell(col: number, row: number): Cell {
        return new QuoteCell(this);
    }

    // Due to the strictness of inheritance in TypeScript we must implement the rest of the abstract methods from Cell that was not overwritten by ConstCell:
    Reset(): void {
        throw new Error("Method not implemented.");
    }

}

// A TextCell is a cell containing a double-quoted string constant.
export class TextCell extends ConstCell {
    public readonly value: TextValue;

    constructor(argument: string | TextCell) {
        super();
        if (argument instanceof TextCell) {
            this.value = argument.value;
        } else {
            console.assert(argument !== null); // If the argument is null we get a warning but the execution is not stopped.
            this.value = TextValue.Make(argument);
        }
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(acol: number, row: number, fo: Formats): string {
        return '"' + this.value.value + '"'; // not just the TextValue but the value of the TextValue which gives us an actual string.
    }

    public override CloneCell(col: number, row: number): Cell {
        return new TextCell(this);
    }

    // Due to the strictness of inheritance in TypeScript we must implement the rest of the abstract methods from Cell that was not overwritten by ConstCell:
    Reset(): void {
        throw new Error("Method not implemented.");
    }

}

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
    public state: CellState = CellState.Dirty;
    private v: Value | null;

    constructor(workbook: Workbook, e: Expr) {
        super();
        this.workbook = workbook;
        this.e = e;
        this.state = CellState.Uptodate;
        this.v = null
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
/**
                const culprit: FullCellAddress = new FullCellAddress(sheet, null, col, row);
                const msg = `### CYCLE in cell ${culprit} formula ${this.Show(col, row, this.workbook.format)} `;
                throw new CyclicException(msg, culprit); // Culprit should be added to this.
*/
            case CellState.Dirty:
            case CellState.Enqueued:
                this.state = CellState.Computing;
                this.v = this.e.Eval(sheet, col, row);
                this.state = CellState.Uptodate;
                if (this.workbook.UseSupportSets) {
                    this.ForEachSupported(Formula.EnqueueCellForEvaluation);
                    break;

                }
                break
        }
        return this.v as Value;
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
        if (adjusted.has(this.e) && r < adjusted.get(this.e)!.maxValidRow) {
            ae = adjusted.get(this.e)!;
        } else {
            ae = this.e.InsertRowCols(modSheet, thisSheet, R, N, r, doRows);
            console.log("Making new adjusted at rowcol " + r + "; upper = " + ae.maxValidRow);
            if (ae.isUnchanged) {
                ae = new Adjusted<Expr>(this.e, ae.maxValidRow, ae.isUnchanged);
                console.log("Reusing expression");
            }
            adjusted.set(this.e, ae)
        }
        this.e = ae.type;
    }

    /**
     * Returns the cached value that is the result of this formula
     * @constructor
     */
    public get Cached(): Value {
        return this.v as Value;
    }

    /**
     * Marks a formula cell dirty
     * Not much to comment on
     * @constructor
     */
    public override MarkDirty() {
        if (this.state != CellState.Dirty) {
            this.state = CellState.Dirty;
            this.ForEachSupported(Formula.MarkCellDirty);
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
        this.e.AddToSupportSets(supported, col,row, rows, cols);
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
        return this.e.isVolatile;
    }

    public override (here: FullCellAddress, dependsOn: (fullCellAddr: FullCellAddress) => void): void {
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
        return "=" + this.e.Show(col, row, 0, fo);
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

    DependsOn(here: FullCellAddress, dependsOn: (fullCellAddr: FullCellAddress) => void): void {
        this.e.DependsOn(here, dependsOn);
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

    public override DependsOn(here: FullCellAddress, dependsOn: (fullCellAddr: FullCellAddress) => void): void {
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
