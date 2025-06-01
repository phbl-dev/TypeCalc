import type { Workbook } from "./Workbook";
import {
    Cell,
    BlankCell,
    CachedArrayFormula,
    Formula,
    ArrayFormula,
} from "./Cells";
import { type Adjusted, Interval, SuperCellAddress } from "./CellAddressing";
import { Expr } from "./Expressions";
import { adjustFormula } from "../front-end/HelperFunctions.tsx";

/**
 * Represents a spreadsheet sheet.
 */
export class Sheet {
    public cols = 65536;
    public rows = 1048576;
    private name: string;
    public readonly workbook: Workbook;
    private readonly cells: SheetRep;
    private history: { cell: Cell; row: number; col: number }[]; // Added for undo/redo functionality. Array for caching added cells such that we can undo and redo them.
    private historyPointer: number; // Added for undo/redo functionality. Points at where we are in the history.
    private undoCount: number; // Added for undo/redo functionality. Counts how deep we are in undo calls.
    private functionSheet: boolean;

    /**
     * Constructors are defined below. There is supposed to be two constructors,
     * where the first one uses the default number of columns (65536) and rows (1048576).
     * The second constructor allows us to give our own value for cols and rows.
     * @defaultValue: columns = 65536, rows = 1048576
     * @example
     * // returns a sheet with 10 columns and 10 rows.
     *  const sheet:Sheet = new Sheet(workbook, "sheet1", 100, 100, false);
     */

    constructor(
        workbook: Workbook,
        sheetName: string,
        arg3: boolean | number,
        arg4?: number,
        arg5?: boolean,
    ) {
        if (!arg4) {
            this.name = sheetName;
            this.workbook = workbook;
            this.functionSheet = arg3 as boolean; // This has to be a boolean if argument four is undefined.
        } else {
            this.name = sheetName;
            this.workbook = workbook;
            this.functionSheet = arg5 as boolean;
            this.cols = arg3 as number;
            this.rows = arg4;
            this.workbook.AddSheet(this);
        }
        this.cells = new SheetRep();
        this.history = []; // Initially empty because no cells have been added yet
        this.historyPointer = 0; // Initially 0 because there is nothing else in the history to point at
        this.undoCount = 0; // Initially 0 because nothing have been undone
    }

    /**
     * Returns the number of columns in the sheet
     * @constructor
     */
    public get Cols(): number {
        return this.cols;
    }

    /**
     * Adjust the number of columns in the sheet.
     * @constructor
     * @param val  the number of columns, that the sheet should now contain.
     */

    public set Cols(val: number) {
        this.cols = val;
    }

    public MoveCell(
        fromCol: number,
        fromRow: number,
        col: number,
        row: number,
    ) {
        if (this.cells != null) {
            const originalCell: Cell = this.cells.Get(fromCol, fromRow)!;

            const originalSupportSet = originalCell.GetSupportSet();

            this.Set(
                col as number,
                originalCell.MoveContents(col - fromCol, row - fromRow),
                row,
            );

            const newCell: Cell = this.cells.Get(col, row)!;

            this.RemoveCell(fromCol, fromRow);

            if (originalSupportSet != null) {
                const blankCell = this.cells.Get(fromCol, fromRow)!;

                newCell.TransferSupportTo(blankCell);
                this.workbook.RecordCellChange(fromCol, fromRow, this);
                this.workbook.RecordCellChange(col, row, this);
            }
        }
    }

    /**
     * Returns the number of rows in the sheet.
     * @constructor
     */
    public get Rows(): number {
        return this.rows;
    }

    /**
     * Adjust the number of rows in the sheet.
     * @param val the number of rows, that the sheet should now contain.
     * @constructor
     */
    public set Rows(val: number) {
        this.rows = val;
    }

    /**
     * Getting the cells field safely for RebuildSupportGraph() in Workbook.ts.
     */
    public getCells(): SheetRep {
        return this.cells;
    }

    /**
     * The undo method is used when a user press "ctrl+z" to draw back an action in the spreadsheet.
     *
     * @remarks
     * The functionality of the method will only be invoked if there are actions to undo, i.e.
     * the size of the undoCount is smaller than the length of the history array.
     *
     * @returns void
     */
    public undo(): void {
        // If the undoCount is smaller than the length of the history, then there are cells to undo.
        if (this.undoCount < this.history.length) {
            // Increase the undoCount to indicate that undo has been called.
            this.undoCount++;

            // Decrease the historyPointer to indicate that we go one step back in the history.
            this.historyPointer--;

            // Loop over the history in reversed order to check for older versions of the cell we are resetting.
            // We subtract the undoCount-1 to avoid matching the same cell and to avoid matching redundant cells
            // in case the user has called undo multiple times:
            for (
                let i = this.history.length - this.undoCount - 1;
                i >= 0;
                i--
            ) {
                // If a previous version of that cell already exists in the history:
                if (
                    this.history[i].row ===
                        this.history[this.history.length - this.undoCount]
                            .row &&
                    this.history[i].col ===
                        this.history[this.history.length - this.undoCount].col
                ) {
                    // Then set the cell to that previous state
                    this.cells.Set(
                        this.history[i].col,
                        this.history[i].row,
                        this.history[i].cell,
                    );
                    return;
                }
            }
            // Else, set the cell to null because then it should just be blank
            this.cells.Set(
                this.history[this.historyPointer].col,
                this.history[this.historyPointer].row,
                new BlankCell(),
            );
        }
    }

    /**
     * The redo method is used when a user presses "ctrl+y" to restore an action in the spreadsheet.
     * The functionality of the method will only be invoked if there are actions to redo, i.e.
     * the size of the undoCount is larger than 0.
     */
    public redo(): void {
        // If the undoCount is larger than 0 then there are cells to redo:
        if (this.undoCount > 0) {
            // We get index that undoCount is at in relation to the history length because we
            // want to redo and get update the cell in that spot.
            const i = this.history.length - this.undoCount;
            this.cells.Set(
                this.history[i].col,
                this.history[i].row,
                this.history[i].cell,
            );

            // We have moved one step forward in the history array so we increase the history pointer by 1:
            this.historyPointer++;

            // We decrease the undoCount because we have now recreated an action:
            this.undoCount--;
        }
    }

    /**
     * Recalculates all cells within this sheet
     * It uses the individual Eval method from the cells.
     * @see  {Cell#Eval}
     * @constructor
     */
    public RecalculateFull(): void {
        this.cells.Forall((col: number, row: number, cell: Cell) =>
            cell.Eval(this, col, row),
        );
    }

    /**
     * Shows the content of all non-null cells.
     * @param show
     * @throws Error if any cell is null.
     * @constructor
     */
    public ShowAll(
        show: (col: number, row: number, arg3: string) => void,
    ): void {
        for (let c = 0; c < this.Cols; c++) {
            for (let r = 0; r < this.Rows; r++) {
                const cell: Cell | null = this.Get(c, r);
                if (cell != null) {
                    show(c, r, this.ShowValue(c, r));
                }
            }
        }
    }

    /**
     *  Resets all the cells in the sheet.
     *  It uses the cells own implementation of reset.
     * @see  {Cell#Reset}
     * @constructor
     *
     */
    public ResetCellState(): void {
        for (const cell of this.cells) {
            if (cell != null) {
                cell.Reset();
            }
        }
    }

    /**
     * Sets the specified cell instance into the sheet at column X and row Y
     * utilises the AddToSupportSets method defined in cells.
     * @param cell - cell to be changed
     * @param col - cell column value
     * @param row - cell row value.
     * @see {Cell#AddToSupportSets}
     * @constructor
     * @example
     * // Set cell C to occupy the area defined with column X and row Y
     * SetCell(C, X,Y)
     *
     */

    public SetCell(cell: Cell, col: number, row: number): void {
        this.Set(col as number, cell, row);
        if (cell != null) {
            cell.AddToSupportSets(this, col, row, 1, 1);
            cell.SetColAndRow(col, row);
        }
    }

    /**
     * Certain expressions can result in multiple values being outputted.
     * Inserts the resulting values into the sheet, pointing to a CachedArrayFormula
     * @param cell
     * @param col
     * @param row
     * @param ulCa
     * @param lrCa
     * @constructor
     */
    public SetArrayFormula(
        cell: Cell,
        col: number,
        row: number,
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
    ): void {
        const formula: Formula = cell as Formula;
        if (cell == null) {
            throw new Error("Invalid array formula");
        } else {
            const caf: CachedArrayFormula = new CachedArrayFormula(
                formula,
                this,
                col,
                row,
                ulCa,
                lrCa,
            );
            formula.AddToSupportSets(this, col, row, 1, 1);
            const displayCols = new Interval(ulCa.col, lrCa.col);
            const displayRows = new Interval(ulCa.row, lrCa.row);

            formula.ResetSupportSet();
            formula.AddSupport(this, col, row, this, displayCols, displayRows);

            const cols: number = lrCa.col - ulCa.col + 1,
                rows = lrCa.row - ulCa.row + 1;

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const f = new ArrayFormula(caf, c, r);

                    if (c == 0 && r == 0) {
                        f.setTextField(caf.formula.GetText()!);
                    }
                    this.SetCell(f, ulCa.col + c, ulCa.row + r);
                }
            }
        }
    }

    /**
     * Perform an operation on each Cell within a designated area.
     * Makes use of a callback function to perform the operation.
     * @param fromCol
     * @param fromCol
     * @param fromRow
     * @param toCol
     * @param toRow
     * @param act
     * @constructor
     */
    public ForEachInArea(
        fromCol: number,
        fromRow: number,
        toCol: number,
        toRow: number,
        act: (
            cell: Cell,
            col: number,
            row: number,
            fromRow: number,
            fromCol: number,
        ) => void,
    ) {
        for (let c = fromCol; c <= toCol; c++) {
            for (let r = fromRow; r <= toRow; r++) {
                const cell: Cell | null = this.Get(c, r);
                if (cell != null) {
                    act(cell, c, r, fromRow, fromCol);
                }
            }
        }
        this.workbook.Recalculate();
    }

    /**
     * Copies the cell at col, row to the targetCol and targetRow
     * It uses the SetCell method to set the cell at targetCol and targetRow
     * @param cell
     * @param col
     * @param row
     * @param targetCol
     * @param targetRow
     * @param content
     * @constructor
     */
    public PasteCell(
        cell: Cell,
        col: number,
        row: number,
        targetCol: number,
        targetRow: number,
        content: string,
    ): void {
        if (cell instanceof Formula) {
            this.SetCell(
                Cell.Parse(
                    adjustFormula(content!, targetRow - row, targetCol - col),
                    this.workbook,
                    targetCol,
                    targetRow,
                )!,
                targetCol,
                targetRow,
            );
        } else {
            this.SetCell(
                Cell.Parse(content!, this.workbook, targetCol, targetRow)!,
                targetCol,
                targetRow,
            );
        }
    }

    /**
     * Moves the cell at col, row to the targetCol and targetRow
     * It uses the SetCell method to set the cell at targetCol and targetRow
     * @param cell
     * @param col
     * @param row
     * @param targetCol
     * @param targetRow
     * @param content
     * @constructor
     */
    public CutCell(
        cell: Cell,
        col: number,
        row: number,
        targetCol: number,
        targetRow: number,
        content: string,
    ): void {
        this.PasteCell(cell, col, row, targetCol, targetRow, content);
        this.RemoveCell(col, row);
    }

    /**
     * Removes the cell at col, row
     * @param col
     * @param row
     * @constructor
     */
    public RemoveCell(col: number, row: number): void {
        this.cells.Set(col, row, new BlankCell());
    }

    /**
     * Inserts new Rows or Cols, depending on the doRows value.
     * Not used in TypeCalc as of this version!
     * @param R
     * @param N
     * @param doRows
     * @constructor
     */

    public InsertRowsCols(R: number, N: number, doRows: boolean): void {
        if (R >= 1) {
            if (doRows) {
                for (let col = 0; col < this.Cols; col++) {
                    const cell: Cell | null = this.cells.Get(col, R - 1);
                    const mf: ArrayFormula = cell as unknown as ArrayFormula;
                    if (mf != null && mf.Contains(col, R)) {
                        throw new Error("Row insert would split array formula");
                    }
                }
            } else {
                for (let row = 0; row < this.Rows; row++) {
                    const cell: Cell | null = this.cells.Get(R - 1, row);
                    const mf: ArrayFormula = cell as unknown as ArrayFormula;
                    if (mf != null && mf.Contains(R, this.Rows)) {
                        throw new Error(
                            "Column insert would split array formula",
                        );
                    }
                }
            }
            const adjusted: Map<Expr, Adjusted<Expr>> = new Map();

            for (const sheet of this.workbook) {
                for (let r = 0; r < sheet.Rows; r++) {
                    for (let c = 0; c < sheet.Cols; c++) {
                        const cell: Cell | null = sheet.cells.Get(c, r);
                        if (cell != null) {
                            cell.InsertRowCols(
                                adjusted,
                                this,
                                sheet == this,
                                R,
                                N,
                                doRows ? r : c,
                                doRows,
                            );
                        }
                    }
                }
            }

            if (doRows) {
                for (let r = this.Rows - 1; r >= R + N; r--) {
                    for (let c = 0; c < this.Cols; c++) {
                        const existingCell: Cell | null = this.cells.Get(
                            c,
                            r - N,
                        ); // Get the old cell and move it down
                        if (existingCell != null) {
                            // Move the cell to the new position
                            this.cells.Set(c, r, existingCell);
                            // Now clear the old position after moving the cell
                            this.cells.Set(c, r - N, new BlankCell());
                        }
                    }
                }

                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < this.Cols; c++) {
                        this.cells.Set(c, r + R, null); // Set new rows to null (empty)
                    }
                }
            } else {
                for (let c = this.Cols - 1; c >= R + N; c--) {
                    for (let r = 0; r < this.Rows; r++) {
                        const oldCell: Cell | null = this.cells.Get(c - N, r);
                        if (oldCell != null) {
                            // This is different from Sestoft's implementation.
                            // TS fucking sucks.
                            this.cells.Set(c - N, r, oldCell);

                            this.cells.Set(c - N, r, new BlankCell());
                        }
                    }
                }

                for (let c = 0; c < N; c++) {
                    for (let r = 0; r < this.Rows; r++) {
                        this.cells.Set(c + R, r, null); // Set new columns to null (empty)
                    }
                }
            }
        }
    }

    /**
     * Returns a string on the contents of a cell.
     * format is defined in workbook, and it utilises the internal method of cell
     * @see Cell#Show
     * @param col
     * @param row
     * @constructor
     */
    public Show(col: number, row: number): string {
        if (0 <= col && col < this.Cols && 0 <= row && row <= this.Rows) {
            if (this.cells != null) {
                const cell: Cell = this.cells.Get(col, row)!;
                if (cell != null) {
                    return cell.Show(col, row, this.workbook.format);
                }
            }
        }
        return null as unknown as string;
    }

    /**
     * Returns a string on the contents of a cell.
     * format is defined in workbook, and it utilises the internal method of cell
     * @see Cell#Show
     * @param col
     * @param row
     * @constructor
     */
    public ShowValue(col: number, row: number): string {
        console.log("Entered into this");

        if (0 <= col && col < this.Cols && 0 <= row && row <= this.Rows) {
            if (this.cells != null) {
                const cell: Cell = this.cells.Get(col, row)!;
                if (this.workbook.format.getShowFormulas()) {
                    return cell.Show(col, row, this.workbook.format);
                } else {
                    return cell.showValue(this, col, row);
                }
            }
        }
        return null as unknown as string;
    }

    /**
     * Retrieves a Cell-reference or a null-pointer depending on the value of the cell area.
     *
     * @param col
     * @param row
     * @constructor
     */
    public Get(col: number | SuperCellAddress, row?: number): Cell | null {
        if (row || row === 0) {
            // if row is 0 it would evaluate to false. Therefore, we add "|| row === 0".
            return (col as number) < this.cols && row < this.rows
                ? this.cells!.Get(col as number, row)
                : null;
        } else {
            col = col as SuperCellAddress;
            return this.cells.Get(col.col, col.row);
        }
    }

    /**
     * Sets the value of a cell-reference. It will throw an error if there is an issue in this.
     * @param col
     * @param newCell
     * @param row
     * @constructor
     */
    public Set(
        col: number | SuperCellAddress,
        newCell: Cell,
        row?: number,
    ): void {
        if (row || row === 0) {
            if (typeof col === "number") {
                // Ensure col is a number before proceeding
                if (col < this.cols && row < this.rows) {
                    const oldCell: Cell | null = this.cells.Get(col, row); // Avoid non-null assertion
                    if (
                        oldCell !== null &&
                        oldCell !== undefined &&
                        oldCell !== newCell
                    ) {
                        oldCell.TransferSupportTo(newCell);
                        this.workbook.DecreaseVolatileSet(
                            oldCell,
                            this,
                            col,
                            row,
                        );
                        oldCell.RemoveFromSupportSets(this, col, row);
                    }
                    this.workbook.IncreaseVolatileSet(newCell, this, col, row);
                    this.cells.Set(col, row, newCell);
                    this.workbook.RecordCellChange(col, row, this);
                }
            }
        } else if (col instanceof SuperCellAddress) {
            // Fix: Ensure col is a SuperCellAddress
            console.log("col:", col.col, "row:", col.row);
            this.Set(col.col, newCell, col.row);
        }

        // The history array has a cap of max 100:
        // Adding the cell to our undo/redo history if it has length < 100.
        if (this.history.length < 100) {
            this.manageHistory(row, col, newCell);
            // Increase the historyPointer such that it follows the history array
            this.historyPointer++;
        } else {
            // Otherwise, we use the slice method to exclude the first element
            // from the history array and give it length 99:
            this.history = this.history.slice(1);
            // Now we can call manageHistory() to add the new cell.
            this.manageHistory(row, col, newCell);
            // Note that we don't increase the history pointer here
            // because the history stays at the same length of 100.
        }
    }

    /**
     * Added for handling Undo/Redo functionality.
     * @param row
     * @param col
     * @param newCell
     * @private
     */
    private manageHistory(
        row: number | undefined,
        col: number | SuperCellAddress,
        newCell: Cell,
    ) {
        // First we check if the type of row and col is number:
        if (typeof row === "number" && typeof col === "number") {
            // If the user sets a new value in the sheet but "undo" has been called a number of times,
            // then we make sure to shorten the history in accordance with the number of undo calls.
            // This is important because then we remove the old values from the history that have already
            // been "undone" by the user, and we therefore don't want to store them any longer because the
            // user is setting new cells again.
            if (this.undoCount > 0) {
                for (let i = 0; i < this.undoCount; i++) {
                    this.history.pop();
                }

                // Reset undoCount because the history has been updated:
                this.undoCount = 0;

                // Add the newly created cell to our history:
                this.history.push({ cell: newCell, row: row, col: col });

                // Otherwise, if undo has not been called then we can just add our new cell to the history
                // because the user have not undone any values that we should remove from the history:
            } else {
                this.history.push({ cell: newCell, row: row, col: col }); // Push the cell and its position to the history array
            }
        }
    }

    /**
     * Setter method for name
     * @param name
     */

    public setName(name: string): void {
        this.name = name;
    }

    /**
     * Getter method for name
     */
    public getName(): string {
        return this.name;
    }

    /**
     * Detect blocks of formula copies, for finding compact support sets
     */
    public AddToSupportSets(): void {
        const sheetCols = this.Cols,
            sheetRows = this.Rows;
        this.cells.Forall((col: number, row: number, cell: Cell) => {
            if (cell instanceof ArrayFormula) {
                const af: ArrayFormula = cell as ArrayFormula;
                af.AddToSupportSets(this, col, row, 1, 1);
            } else if (cell instanceof Formula) {
                const f = cell as Formula;
                if (!f.Visited) {
                    const expr: Expr = f.Expr;
                    let size = 1;
                    while (
                        col + size < sheetCols &&
                        row + size < sheetRows &&
                        this.CheckCol(col + size, row, expr, size) &&
                        this.CheckRow(col, row + size, expr, size)
                    ) {
                        size++;
                    }
                    let rows = size;
                    while (
                        row + rows < sheetRows &&
                        this.CheckRow(col, row + rows, expr, size - 1)
                    ) {
                        rows++;
                    }

                    let cols = size;
                    while (
                        col + cols < sheetCols &&
                        this.CheckCol(col + cols, row, expr, size - 1)
                    ) {
                        cols++;
                    }

                    if (rows > cols) {
                        cols = size;
                    } else {
                        rows = cols;
                    }

                    for (let deltaCol = 0; deltaCol < cols; deltaCol++) {
                        for (let deltaRow = 0; deltaRow < rows; deltaRow++) {
                            (
                                this.Get(
                                    col + deltaCol,
                                    row + deltaRow,
                                ) as unknown as Formula
                            ).Visited = true;
                        }
                    }
                    expr.AddToSupportSets(this, col, row, cols, rows);
                }
            }
        });
        this.ResetCellState();
    }

    private CheckRow(
        col: number,
        row: number,
        expr: Expr,
        size: number,
    ): boolean {
        for (let i = 0; i <= size; i++) {
            const fcr: Formula = this.Get(col + i, row) as unknown as Formula;
            if (fcr == null || fcr.Visited || fcr.Expr != expr) {
                return false;
            }
        }
        return true;
    }

    private CheckCol(
        col: number,
        row: number,
        expr: Expr,
        size: number,
    ): boolean {
        for (let i = 0; i <= size; i++) {
            const fcr: Formula = this.Get(col, row + i) as unknown as Formula;
            if (fcr == null || fcr.Visited || fcr.Expr != expr) {
                return false;
            }
        }
        return true;
    }

    /**
     * Adds support to a specific cell in the given column and row with details from the supported sheet and intervals.
     * @param {number} col - The column index of the cell to which support is added.
     * @param {number} row - The row index of the cell to which support is added.
     * @param {Sheet} supportedSheet - The sheet that provides the support.
     * @param {Interval} supportedCols - The interval of columns in the supported sheet that define the support range.
     * @param {Interval} supportedRows - The interval of rows in the supported sheet that define the support range.
     * @return {void} Does not return a value.
     */
    public AddSupport(
        col: number,
        row: number,
        supportedSheet: Sheet,
        supportedCols: Interval,
        supportedRows: Interval,
    ): void {
        let cell: Cell | null = this.Get(col, row);
        if (cell == null) {
            cell = new BlankCell();
            this.Set(col, cell, row);
        }
        cell.AddSupport(
            this,
            col,
            row,
            supportedSheet,
            supportedCols,
            supportedRows,
        );
    }

    /**
     * Increases the volatile set, determining the number of updates needed.
     * @constructor
     */
    public IncreaseVolatileSet(): void {
        this.cells.Forall((col, row, cell) =>
            this.workbook.IncreaseVolatileSet(cell, this, col, row),
        );
    }

    /**
     * returns Sheet name.
     */
    public toString(): string {
        return this.name;
    }
}

/**
 * This class maintains the sheet using the QT4-structure as defined by Sestoft (2014)
 * We have described this in detail on the TypeCalc Repository report.
 */
class SheetRep {
    private LOGW = 4;
    W = 1 << this.LOGW;
    MW = this.W - 1;
    SIZEW = 1 << (4 * this.LOGW);
    LOGH = 5;
    H = 1 << this.LOGH;
    MH = this.H - 1;
    SIZEH = 1 << (4 * this.LOGH);

    private readonly tile0: Cell[][][][] | null[][][][] = new Array(
        this.W * this.H,
    )
        .fill(null)
        .map(() => []);

    /**
     * Retrieve a cell value from the sheet.
     * @param c
     * @param r
     * @constructor
     */
    public Get(c: number, r: number): Cell | null {
        if (c < 0 || this.SIZEW <= c || r < 0 || this.SIZEH <= r) {
            return null;
        }
        const tile1: Cell[][][] | null[][][] =
            this.tile0[
                (((c >> (3 * this.LOGW)) & this.MW) << this.LOGH) |
                    ((r >> (3 * this.LOGH)) & this.MH)
            ];
        if (tile1 == null) {
            return null;
        }
        const tile2: Cell[][] | null[][] =
            tile1[
                (((c >> (2 * this.LOGW)) & this.MW) << this.LOGH) |
                    ((r >> (2 * this.LOGH)) & this.MH)
            ];
        if (tile2 == null) {
            return null;
        }
        const tile3: Cell[] | null[] =
            tile2[
                (((c >> this.LOGW) & this.MW) << this.LOGH) |
                    ((r >> this.LOGH) & this.MH)
            ];
        if (tile3 == null) {
            return null;
        }
        return tile3[((c & this.MW) << this.LOGH) | (r & this.MH)];
    }

    /**
     * Insert a cell value into the sheet.
     * @param c
     * @param r
     * @param value
     * @constructor
     */
    public Set(c: number, r: number, value: Cell | null): void {
        if (c < 0 || c >= this.SIZEW || r < 0 || r >= this.SIZEH) return;

        const index0 =
            (((c >> (3 * this.LOGW)) & this.MW) << this.LOGH) |
            ((r >> (3 * this.LOGH)) & this.MH);
        this.tile0[index0] ??= new Array(this.W * this.H);
        const tile1: Cell[][][] | null[][][] = this.tile0[index0];

        const index1 =
            (((c >> (2 * this.LOGW)) & this.MW) << this.LOGH) |
            ((r >> (2 * this.LOGH)) & this.MH);
        tile1[index1] ??= new Array(this.W * this.H);
        const tile2: Cell[][] | null[][] = tile1[index1];

        const index2 =
            (((c >> this.LOGW) & this.MW) << this.LOGH) |
            ((r >> this.LOGH) & this.MH);
        tile2[index2] ??= new Array(this.W * this.H);
        const tile3: Cell[] | null[] = tile2[index2];

        const index3 = ((c & this.MW) << this.LOGH) | (r & this.MH);
        if (value instanceof Cell) {
            tile3[index3] = value;
        } else {
            tile3[index3] = null;
        }
    }

    /**
     * Loop through all active cells in the SheetRep
     * @returns {IterableIterator<Cell>}
     */
    public *[Symbol.iterator](): IterableIterator<Cell> {
        for (const tile1 of this.tile0) {
            if (tile1 != null) {
                for (const tile2 of tile1) {
                    if (tile2 != null) {
                        for (const tile3 of tile2) {
                            if (tile3 != null) {
                                for (const cell of tile3) {
                                    if (cell != null) {
                                        yield cell;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Allows us to perform an action on every cell in the SheetRep
     * @param act
     * @constructor
     */
    public Forall(act: (arg1: number, arg2: number, arg3: Cell) => void): void {
        let i0 = 0;
        this.tile0.forEach((tile1: Cell[][][] | null[][][]) => {
            let i1 = 0;
            const c0 = (i0 >> this.LOGH) << (3 * this.LOGW);
            const r0 = (i0 & this.MH) << (3 * this.LOGH);
            if (tile1 != null) {
                tile1.forEach((tile2: Cell[][] | null[][]) => {
                    let i2 = 0;
                    const c1 = (i1 >> this.LOGH) << (2 * this.LOGW);
                    const r1 = (i1 & this.MH) << (2 * this.LOGH);
                    if (tile2 != null) {
                        tile2.forEach((tile3: Cell[] | null[]) => {
                            let i3 = 0;
                            const c2 = (i2 >> this.LOGH) << this.LOGW;
                            const r2 = (i2 & this.MH) << this.LOGH;
                            if (tile3 != null) {
                                tile3.forEach((cell: Cell | null) => {
                                    if (cell != null) {
                                        act(
                                            c0 | c1 | c2 | (i3 >> this.LOGH),
                                            r0 | r1 | r2 | (i3 & this.MH),
                                            cell,
                                        );
                                    }
                                    i3++;
                                });
                            }
                            i2++;
                        });
                    }
                    i1++;
                });
            }
            i0++;
        });
    }

    /**
     * Iterates through SheetRep row by row rather than column by column as this is how
     * the export formats structure the output.
     */
    public *iterateForExport(): IterableIterator<Cell> {
        const cells: { cell: Cell; row: number; col: number }[] = [];

        let i0 = 0;
        for (const tile1 of this.tile0) {
            if (tile1 != null) {
                const c0 = (i0 >> this.LOGH) << (3 * this.LOGW);
                const r0 = (i0 & this.MH) << (3 * this.LOGH);

                let i1 = 0;
                for (const tile2 of tile1) {
                    if (tile2 != null) {
                        const c1 = (i1 >> this.LOGH) << (2 * this.LOGW);
                        const r1 = (i1 & this.MH) << (2 * this.LOGH);

                        let i2 = 0;
                        for (const tile3 of tile2) {
                            if (tile3 != null) {
                                const c2 = (i2 >> this.LOGH) << this.LOGW;
                                const r2 = (i2 & this.MH) << this.LOGH;

                                let i3 = 0;
                                for (const cell of tile3) {
                                    if (cell != null) {
                                        const col =
                                            c0 | c1 | c2 | (i3 >> this.LOGH);
                                        const row =
                                            r0 | r1 | r2 | (i3 & this.MH);
                                        cells.push({ cell, row, col });
                                    }
                                    i3++;
                                }
                            }
                            i2++;
                        }
                    }
                    i1++;
                }
            }
            i0++;
        }

        // Sort by row then by col
        cells.sort((a, b) => {
            if (a.row !== b.row) {
                return a.row - b.row;
            }
            return a.col - b.col;
        });

        for (const { cell } of cells) {
            yield cell;
        }
    }
}
