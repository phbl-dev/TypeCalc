import { Workbook } from "./Workbook";
import { Cell, BlankCell, CachedArrayFormula, Formula, ArrayFormula } from "./Cells";
import { Adjusted, Interval, SuperCellAddress } from "./CellAddressing";
import { Expr } from "./Expressions";
import { ArrayValue } from "./ArrayValue";

/**
 * Creates a new sheet. Default size is 20 columns and 1000 rows.
 */
export class Sheet {
    public cols: number = 2000;
    public rows: number = 10000;
    private name: string;
    public readonly workbook: Workbook;
    private readonly cells: SheetRep;
    private functionSheet: boolean;

    constructor(workbook: Workbook, name: string, functionSheet: boolean);

    constructor(workbook: Workbook, name: string, cols: number, rows: number, functionSheet: boolean);

    /**
     * Constructors are defined below. There is supposed to be two constructors,
     * where the first one uses the default number of columns (20) and rows (1000).
     * The second constructor allows us to give our own value for cols and rows.
     * @defaultValue: columns = 20, rows = 1000
     * @example
     * // returns a sheet with 10 columns and 10 rows.
     *  const sheet:Sheet = new Sheet(workbook, "sheet1", 100, 100, false);
     */

    constructor(workbook: Workbook, sheetName: string, arg3: boolean | number, arg4?: number, arg5?: boolean) {
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
     * Recalculates all cells within this sheet
     * It uses the individual Eval method from the cells.
     * @see  {Cell#Eval}
     * @constructor
     */
    public RecalculateFull(): void {
        this.cells.Forall((col: number, row: number, cell: Cell) => cell.Eval(this, col, row));
    }

    /**
     * Shows the content of all non-null cells.
     * @param show
     * @throws Error if any cell is null.
     * @constructor
     */
    public ShowAll(show: (col: number, row: number, arg3: string) => void): void {
        for (let c: number = 0; c < this.Cols; c++) {
            for (let r: number = 0; r < this.Rows; r++) {
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
        }
    }

    /**
     * Inserts the cell array formula onto the sheet.
     * It throws an error if the input given is invalid.
     *
     * @param cell
     * @param col
     * @param row
     * @param ulCa
     * @param lrCa
     * @constructor
     */
    public SetArrayFormula(cell: Cell, col: number, row: number, ulCa: SuperCellAddress, lrCa: SuperCellAddress): void {
        const formula: Formula = cell as unknown as Formula;
        if (cell == null) {
            throw new Error("Invalid array formula");
        } else {
            const caf: CachedArrayFormula = new CachedArrayFormula(formula, this, col, row, ulCa, lrCa);
            formula.AddToSupportSets(this, col, row, 1, 1);
            const displayCols = new Interval(ulCa.col, lrCa.col);
            const displayRows = new Interval(ulCa.row, lrCa.row);

            formula.ResetSupportSet();
            formula.AddSupport(this, col, row, this, displayCols, displayRows);

            const cols: number = lrCa.col - ulCa.col + 1,
                rows = lrCa.row - ulCa.row + 1;

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    this.Set(ulCa.col + c, new ArrayFormula(caf, c, r) as unknown as Cell, ulCa.row + r);
                }
            }
        }
    }

    /**
     * Not entirely sure how this is supposed to work. It appears as if all Cells are being copied within a specified area
     * @param cell
     * @param col
     * @param row
     * @param cols
     * @param rows
     * @constructor
     */

    public PasteCell(cell: Cell, col: number, row: number, cols: number, rows: number): void {
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                this.Set(col + c, cell.CloneCell(col, row), row + r);
            }
        }
        cell.AddToSupportSets(this, col, row, cols, rows);
    }

    /**
     * Moves a cell from its current column and row to another
     * It finds the cell based on the fromCol and fromRow
     * @param fromCol
     * @param fromRow
     * @param col
     * @param row
     * @constructor
     */
    public MoveCell(fromCol: number, fromRow: number, col: number, row: number) {
        if (this.cells != null) {
            // Added by us. Assume that a sheet is not empty.
            const cell: Cell = this.cells.Get(fromCol, fromRow)!; // This is not allowed to be empty || undefined.
            this.Set(col as number, cell.MoveContents(col - fromCol, row - fromRow), row);
        }
    }

    /**
     * Inserts new Rows or Cols, depending on the doRows value.
     * Is likely going to be changed depending on our frontend implementation.
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
                        throw new Error("Column insert would split array formula");
                    }
                }
            }
            const adjusted: Map<Expr, Adjusted<Expr>> = new Map();

            for (const sheet of this.workbook) {
                for (let r = 0; r < sheet.Rows; r++) {
                    for (let c = 0; c < sheet.Cols; c++) {
                        const cell: Cell | null = sheet.cells.Get(c, r);
                        if (cell != null) {
                            cell.InsertRowCols(adjusted, this, sheet == this, R, N, doRows ? r : c, doRows);
                        }
                    }
                }
            }

            if (doRows) {
                for (let r = this.Rows - 1; r >= R + N; r--) {
                    for (let c = 0; c < this.Cols; c++) {
                        const existingCell: Cell | null = this.cells.Get(c, r - N); // Get the old cell and move it down
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

                            this.cells.Set(c - N, r,  new BlankCell());

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

    public ShowValue(col: number, row: number): string {
        console.log("Entered into this")

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
        if (row || row === 0) { // if row is 0 it would evaluate to false. Therefore, we add "|| row === 0".
            return (col as number) < this.cols && row < this.rows ? this.cells!.Get(col as number, row) : null;
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
    public Set(col: number | SuperCellAddress, newCell: Cell, row?: number): void {
        if (row || row === 0) {
            if (typeof col === "number") {
                // Ensure col is a number before proceeding
                if (col < this.cols && row < this.rows) {
                    const oldCell: Cell | null = this.cells.Get(col, row); // Avoid non-null assertion
                    if (oldCell !== null && oldCell !== undefined && oldCell !== newCell) {
                        oldCell.TransferSupportTo(newCell);
                        this.workbook.DecreaseVolatileSet(oldCell, this, col, row);
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

    public getFuncSheetBool(): boolean {
        return this.functionSheet;
    }

    public setFuncSheet(value: boolean): void {
        this.functionSheet = value;
    }

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
                    while (row + rows < sheetRows && this.CheckRow(col, row + rows, expr, size - 1)) {
                        rows++;
                    }

                    let cols = size;
                    while (col + cols < sheetCols && this.CheckCol(col + cols, row, expr, size - 1)) {
                        cols++;
                    }

                    if (rows > cols) {
                        cols = size;
                    } else {
                        rows = cols;
                    }

                    for (let deltaCol = 0; deltaCol < cols; deltaCol++) {
                        for (let deltaRow = 0; deltaRow < rows; deltaRow++) {
                            (this.Get(col + deltaCol, row + deltaRow) as unknown as Formula).Visited = true;
                        }
                    }
                    expr.AddToSupportSets(this, col, row, cols, rows);
                }
            }
        });
        this.ResetCellState();
    }

    private CheckRow(col: number, row: number, expr: Expr, size: number): boolean {
        for (let i = 0; i <= size; i++) {
            const fcr: Formula = this.Get(col + i, row) as unknown as Formula;
            if (fcr == null || fcr.Visited || fcr.Expr != expr) {
                return false;
            }
        }
        return true;
    }

    private CheckCol(col: number, row: number, expr: Expr, size: number): boolean {
        for (let i = 0; i <= size; i++) {
            const fcr: Formula = this.Get(col, row + i) as unknown as Formula;
            if (fcr == null || fcr.Visited || fcr.Expr != expr) {
                return false;
            }
        }
        return true;
    }

    public AddSupport(col: number, row: number, supportedSheet: Sheet, supportedCols: Interval, supportedRows: Interval) {
        const cell: Cell | null = this.Get(col, row);
        if (cell == null) {
            this.Set(col, new BlankCell(), row);
        }
        if (cell != null) {
            cell.AddSupport(this, col, row, supportedSheet, supportedCols, supportedRows);
        }
    }

    public IncreaseVolatileSet(): void {
        this.cells.Forall((col, row, cell) => this.workbook.IncreaseVolatileSet(cell, this, col, row));
    }

    public toString(): string {
        return this.name;
    }

    getHashCode() {
        return 0;
    }
}

export class SheetRep {
    private LOGW: number = 4;
    W = 1 << this.LOGW;
    MW = this.W - 1;
    SIZEW = 1 << (4 * this.LOGW);
    LOGH = 5;
    H = 1 << this.LOGH;
    MH = this.H - 1;
    SIZEH = 1 << (4 * this.LOGH);

    private readonly tile0: Cell[][][][] = new Array(this.W * this.H).fill(null).map(() => []);

    public Get(c: number, r: number): Cell | null {
        if (c < 0 || this.SIZEW <= c || r < 0 || this.SIZEH <= r) {
            return null;
        }
        const tile1: Cell[][][] = this.tile0[(((c >> (3 * this.LOGW)) & this.MW) << this.LOGH) | ((r >> (3 * this.LOGH)) & this.MH)];
        if (tile1 == null) {
            return null;
        }
        const tile2: Cell[][] = tile1[(((c >> (2 * this.LOGW)) & this.MW) << this.LOGH) | ((r >> (2 * this.LOGH)) & this.MH)];
        if (tile2 == null) {
            return null;
        }
        const tile3: Cell[] = tile2[(((c >> this.LOGW) & this.MW) << this.LOGH) | ((r >> this.LOGH) & this.MH)];
        if (tile3 == null) {
            return null;
        }
        return tile3[((c & this.MW) << this.LOGH) | (r & this.MH)];
    }

    public Set(c: number, r: number, value: Cell | null): void {
        if (c < 0 || c >= this.SIZEW || r < 0 || r >= this.SIZEH) return;

        const index0 = (((c >> (3 * this.LOGW)) & this.MW) << this.LOGH) | ((r >> (3 * this.LOGH)) & this.MH);
        this.tile0[index0] ??= new Array(this.W * this.H);
        let tile1:Cell[][][] = this.tile0[index0];

        const index1 = (((c >> (2 * this.LOGW)) & this.MW) << this.LOGH) | ((r >> (2 * this.LOGH)) & this.MH);
        tile1[index1] ??= new Array(this.W * this.H);
        let tile2: Cell[][] = tile1[index1];

        const index2 = (((c >> this.LOGW) & this.MW) << this.LOGH) | ((r >> this.LOGH) & this.MH);
        tile2[index2] ??= new Array(this.W * this.H);
        let tile3: Cell[] = tile2[index2];

        const index3 = ((c & this.MW) << this.LOGH) | (r & this.MH);
        if (value instanceof Cell) {
            tile3[index3] = value;
        }
    }

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

    public Forall(act: (arg1: number, arg2: number, arg3: Cell) => void): void {
        let i0 = 0;
        this.tile0.forEach((tile1: Cell[][][]) => {
            let i1 = 0;
            const c0 = (i0 >> this.LOGH) << (3 * this.LOGW);
            const r0 = (i0 & this.MH) << (3 * this.LOGH);
            if (tile1 != null) {
                tile1.forEach((tile2: Cell[][]) => {
                    let i2 = 0;
                    const c1 = (i1 >> this.LOGH) << (2 * this.LOGW);
                    const r1 = (i1 & this.MH) << (2 * this.LOGH);
                    if (tile2 != null) {
                        tile2.forEach((tile3: Cell[]) => {
                            let i3 = 0;
                            const c2 = (i2 >> this.LOGH) << this.LOGW;
                            const r2 = (i2 & this.MH) << this.LOGH;
                            if (tile3 != null) {
                                tile3.forEach((cell: Cell) => {
                                    if (cell != null) {
                                        act(c0 | c1 | c2 | (i3 >> this.LOGH), r0 | r1 | r2 | (i3 & this.MH), cell);
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
}
