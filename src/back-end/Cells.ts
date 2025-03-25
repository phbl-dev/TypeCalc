// All the files from the old Cells folder has been moved here to avoid cyclic dependencies.
import { Sheet } from "./Sheet";
import { Value } from "./Value";
import { Adjusted, FullCellAddress, Interval, SupportSet } from "./CellAddressing";
import { Expr } from "./Expressions"; // This should be imported when it's done
import { Formats } from "./Types";
import { Workbook } from "./Workbook"; // This should be imported when it's done
//import { Parser } from "./Parser"; // This should be imported when it's done
import { NumberValue } from "./NumberValue";
import { TextValue } from "./TextValue"; // This should be imported when it's done

export enum CellState {
    Dirty,
    Enqueued,
    Computing,
    Uptodate,
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

    public MarkCellDirty(sheet: Sheet, col: number, row: number): void {
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
        if (text.trim().length > 0) {
            // Check that the text is not just whitespace
            const regex = /\S+/g; // Match non-whitespace sequences (tokens). "\S+" matches a sequence of one or more characters that are not whitespace.
            // "g" ensures that we don't stop after having found the first match for "\S+", but that we continue through the entire length of the string.

            const tokens: string[] = []; // Initializing an empty array for the tokens.
            let match: RegExpExecArray | null; // Initializing a match variable for holding the result of the regex execution. This will be stored as an array.

            // In the while loop we store the array returned by regex.exec(text) in match. Only one token will be stored for each iteration,
            // since exec() only returns one match at a time. Therefore, match[0] will always hold the most recent token that
            // the was found by exec(). We push match[0] onto the tokens array to get a full array of all the matches.
            // When there are no more tokens, then (match = regex.exec(text)) == null and the while loop ends.
            while ((match = regex.exec(text)) !== null) {
                tokens.push(match[0]);
            }

            const parser: Parser = new Parser(tokens); // We create a new Parser and give it the tokens array.
            return parser.parseCell(workbook, col, row); // We call the parseCell() method to return a readable Cell.
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
    public abstract DependsOn(here: FullCellAddress, dependsOn: (act: (arg0: FullCellAddress) => void) => void): void;
}
// A ConstCell is a cell that contains a constant only.
// In contrast to general cells, it is immutable and can be shared
export abstract class ConstCell extends Cell {
    //The MoveContents() overrides the original method and returns the object as a Cell.

    public override AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number) {}

    public override RemoveFromSupportSets(sheet: Sheet, col: number, row: number) {}

    public override ForEachReferred(sheet: Sheet, col: number, row: number, act: (addr: FullCellAddress) => void) {}

    public override MarkDirty(): void {
        this.ForEachSupported(this.MarkCellDirty);
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

    public override DependsOn(here: FullCellAddress, dependsOn: (act: (arg0: FullCellAddress) => void) => void) {}
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


}
