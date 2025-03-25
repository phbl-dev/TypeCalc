import { hashCode, Value } from "./Value";
import { NumberValue } from "./NumberValue";
import { TextValue } from "./TextValue";
import { ErrorValue } from "./ErrorValue";
import { Sheet } from "./Sheet";
import { FullCellAddress, SuperCellAddress } from "./CellAddressing";
import { Cell } from "./Cells";

export abstract class ArrayValue extends Value {
    public static readonly Type = typeof ArrayValue;

    public abstract get Cols(): number;

    public abstract get Rows(): number;

    /**
     * @param ca - a SuperCellAddress.
     * @returns A value
     */
    public get(ca: SuperCellAddress): Value {
        return [ca.col, ca.row] as unknown as Value;
    }

    public abstract Get(col: number, row: number): Value;

    public override ToObject(): object {
        return this;
    }

    public Index(deltaRow: number, deltaCol: number): Value {
        const col: number = deltaCol - 1;
        const row: number = deltaRow - 1;
        if (0 <= col && col < this.Cols && 0 <= row && row < this.Rows) {
            return [col, row] as unknown as Value;
        } else {
            return ErrorValue.refError;
        }
    }

    public abstract View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value;

    public abstract Slice(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value;

    // TS doesn't allow for methods to be over
    public SliceMethod(r1: number, c1: number, r2: number, c2: number): Value {
        const ir1: number = r1 - 1;
        const ic1: number = c1 - 1;
        const ir2: number = r2 - 1;
        const ic2: number = c2 - 1;

        if (0 <= ir1 && ir1 <= ir2 + 1 && ir2 < this.Rows && 0 <= ic1 && ic1 <= ic2 + 1 && ic2 < this.Cols) {
            return this.Slice(new SuperCellAddress(ic1, ir1), new SuperCellAddress(ic2, ir2));
        } else {
            return ErrorValue.refError;
        }
    }

    public static ToDoubleArray1D(v: Value): number[] | null {
        const arr = v as unknown as ArrayValue;
        if (arr != null && arr.Rows == 1) {
            const res: number[] = new Array(arr.Cols);
            for (let i: number = 0; i < arr.Cols; i++) {
                if (arr.Get(i, 0) instanceof NumberValue) {
                    res[i] = (arr.Get(i, 0) as NumberValue).value as number;
                } else {
                    return null;
                }
            }
            return res;
        } else {
            return null;
        }
    }

    public static ToDoubleArray2D(v: Value): number[][] | undefined {
        const arr: ArrayValue = v as unknown as ArrayValue;
        if (arr != null) {
            return arr.ToDoubleArray2DFast();
        } else {
            return [];
        }
    }

    public static ToStringArray1D(v: Value): string[] | null {
        const arr: ArrayValue = v as unknown as ArrayValue;
        if (arr != null && arr.Rows == 1) {
            const res: string[] = new Array(arr.Cols);
            for (let i: number = 0; i < arr.Cols; i++) {
                if (arr.Get(i, 0) instanceof TextValue) {
                    res[i] = (arr.Get(i, 0) as TextValue).value as string;
                } else {
                    return null;
                }
            }
            return res;
        } else {
            return null;
        }
    }

    public static FromStringArray1D(o: object): Value {
        const ss: string[] = o as string[];
        if (ss != null) {
            const vs: Value[][] = Array.from({ length: ss.length }, () => []);
            for (let i = 0; i < ss.length; i++) {
                vs[i][0] = TextValue.FromString(ss[i]);
            }
            return new ArrayExplicit(vs) as unknown as Value;
        } else {
            return ErrorValue.argTypeError;
        }
    }

    public ToDoubleArray2DFast(): number[][] {
        const res: number[][] = Array.from({ length: this.Cols }, (): number[] => new Array(this.Rows).fill(0));

        for (let c = 0; c < this.Cols; c++) {
            for (let r = 0; r < this.Rows; r++) {
                const value = this.Get(c, r);
                if (value instanceof NumberValue && value.value !== undefined) {
                    res[c][r] = value.value;
                } else {
                    return [];
                }
            }
        }
        return res;
    }

    public static FromDoubleArray1D(o: object): Value {
        const xs: number[] = o as number[];
        if (xs != null) {
            const vs: Value[][] = Array.from({ length: xs.length }, () => Array.from({ length: 1 }));
            for (let i = 0; i < xs.length; i++) {
                vs[i][0] = NumberValue.Make(xs[i]);
            }
            return new ArrayExplicit(vs) as unknown as Value;
        } else {
            return ErrorValue.argTypeError;
        }
    }
    public static FromDoubleArray2D(o: object): Value {
        const xs: number[][] = o as number[][];

        if (xs != null) {
            return new ArrayDouble(xs) as unknown as Value;
        } else {
            return ErrorValue.argTypeError;
        }
    }

    private ToDoubleOrNaN(value: Value): number {
        return Number(value) || NaN;
    }

    public Apply(act: (val: Value) => void): void;

    public Apply(act: (val: number) => void): void;

    public Apply(act: ((val: number) => void) | ((val: Value) => void)): void {
        for (let c = 0; c < this.Cols; c++) {
            for (let r = 0; r < this.Rows; r++) {
                const v: Value = this.Get(c, r);
                if (v != null) {
                    if (v instanceof ArrayValue) {
                        v.Apply(act as (val: Value) => void);
                    } else if (typeof act === "function") {
                        if (act.length === 1) {
                            const num = this.ToDoubleOrNaN(v);
                            if (!isNaN(num)) {
                                (act as (val: number) => void)(num);
                            } else {
                                (act as (val: Value) => void)(v);
                            }
                        }
                    }
                }
            }
        }
    }

    public static EqualsElements(arr1: ArrayValue, arr2: ArrayValue): boolean {
        if (arr1 == arr2) {
            return true;
        }
        if (arr1 == null || arr2 == null) {
            return false;
        }
        if (arr1.Rows != arr2.Rows || arr1.Cols != arr2.Cols) {
            return false;
        }
        for (let i = 0; i < arr1.Cols; i++) {
            for (let j = 0; j < arr1.Rows; j++) {
                const v1: Value = arr1.Get(i, j);
                const v2: Value = arr2.Get(i, j);
                if (v1 != v2) {
                    if (v1 == null || v2 == null) {
                        return false;
                    } else if (!v1.Equals(v2)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    public GetHashCode() {
        let result: number = this.Rows * 37 + this.Cols;
        for (let i = 0; i < this.Rows && i < this.Cols; i++) {
            result = result * 37 + hashCode(this.Get(i, i) as unknown as string);
        }
        return result;
    }

    public ToString(): string {
        const sb: string[] = [];
        for (let i = 0; i < this.Rows; i++) {
            for (let j = 0; j < this.Cols; j++) {
                const v: Value = this.Get(j, i); // In sestoft's implementation this is reversed.
                sb.push(v == null ? "[none]" : v.toString());
                if (j < this.Cols - 1) {
                    sb.push("\t");
                }
            }
            if (i < this.Rows - 1) {
                sb.push("\n");
            }
        }
        return sb.join("");
    }
}

export class ArrayView extends ArrayValue {
    public readonly ulCa: SuperCellAddress;
    public readonly lrCa: SuperCellAddress;
    public readonly sheet: Sheet;
    private readonly cols: number;
    private readonly rows: number;

    constructor(ulCa: SuperCellAddress, lrCa: SuperCellAddress, sheet: Sheet) {
        super();
        this.sheet = sheet;
        this.ulCa = ulCa;
        this.lrCa = lrCa;
        this.cols = lrCa.col - ulCa.col + 1;
        this.rows = lrCa.row - ulCa.row + 1;
    }

    public static Make(ulCa: SuperCellAddress, lrCa: SuperCellAddress, sheet: Sheet): ArrayView {
        const result: { ulCa: SuperCellAddress; lrCa: SuperCellAddress } = SuperCellAddress.normalizeArea(ulCa, lrCa);
        return new ArrayView(result.ulCa, result.lrCa, sheet);
    }

    get Cols(): number {
        return this.cols;
    }
    get Rows(): number {
        return this.rows;
    }

    public override Get(col: number, row: number): Value {
        if (0 <= col && col < this.Cols && 0 <= row && row < this.Rows) {
            const c = this.ulCa.col + col,
                r = this.ulCa.row + row;
            const cell: Cell | null = this.sheet.Get(c, r);
            if (cell != null) {
                return cell.Eval(this.sheet, c, r)!;
            } else {
                return null as unknown as Value;
            }
        } else {
            return ErrorValue.naError;
        }
    }

    public Equals(v: Value): boolean;

    public Equals(other: ArrayView): boolean;

    public Equals(o: object): boolean;

    public Equals(arg1: Value | ArrayView | object): boolean {
        if (arg1 instanceof ArrayView) {
            return this.sheet == arg1.sheet && this.ulCa.equals(arg1.ulCa) && this.lrCa.equals(arg1.lrCa);
        } else if (arg1 instanceof Value) {
            return arg1 instanceof ArrayValue && this.Equals(arg1 as ArrayValue);
        } else {
            return arg1 instanceof ArrayView && this.Equals(arg1 as object);
        }
    }

    public Apply(act: ((val: Value) => void) | ((val: number) => void)): void {
        const col0: number = this.ulCa.col,
            row0 = this.ulCa.row;

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const value: Value = new FullCellAddress(this.sheet, null, col0 + c, row0 + r) as unknown as Value;

                if (typeof value === "number") {
                    (act as (val: number) => void)(value);
                } else {
                    (act as (val: Value) => void)(value);
                }
            }
        }
    }

    Slice(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return new ArrayView(ulCa.offset(this.ulCa), lrCa.offset(this.lrCa), this.sheet) as unknown as Value;
    }

    View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return ArrayView.Make(ulCa.offset(this.ulCa), lrCa.offset(this.lrCa), this.sheet) as unknown as Value;
    }
}

class ArrayExplicit extends ArrayValue {
    public ulCellAddress!: SuperCellAddress;
    public lrCellAddress!: SuperCellAddress;
    private cols!: number;
    private rows!: number;
    public values!: Value[][];

    override get Cols(): number {
        return this.cols;
    }

    constructor(values: Value[][]);
    constructor(ulCa: SuperCellAddress, lrCa: SuperCellAddress, values: Value[][]);

    constructor(arg1: SuperCellAddress | Value[][], arg2?: SuperCellAddress, arg3?: Value[][]) {
        super();
        if (Array.isArray(arg1)) {
            const values = arg1;
            const ulCa = new SuperCellAddress(0, 0);
            const lrCa = new SuperCellAddress(values.length - 1, values[0].length - 1);
            this.init(ulCa, lrCa, values);
        } else if (arg2 && arg3) {
            this.init(arg1, arg2, arg3);
        } else {
            throw new Error("Invalid constructor arguments.");
        }
    }

    private init(ulCa: SuperCellAddress, lrCa: SuperCellAddress, values: Value[][]): void {
        this.ulCellAddress = ulCa;
        this.lrCellAddress = lrCa;
        this.values = values;
        this.cols = this.lrCellAddress.col - this.ulCellAddress.col + 1;
        this.rows = this.lrCellAddress.row - this.ulCellAddress.row + 1;
    }

    Equals(v: Value): boolean {
        return ArrayValue.EqualsElements(this, v as unknown as ArrayValue);
    }

    override Get(col: number, row: number): Value {
        if (0 <= col && col < this.Cols && 0 <= row && row < this.Rows) {
            const c: number = this.ulCellAddress.col + col;
            const r: number = this.ulCellAddress.row + row;
            return this.values[c][r];
        } else {
            return ErrorValue.naError;
        }
    }

    override get Rows(): number {
        return this.rows;
    }

    Slice(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return this.View(ulCa, lrCa);
    }

    View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return new ArrayExplicit(ulCa.offset(this.ulCellAddress), lrCa.offset(this.lrCellAddress), this.values) as unknown as Value;
    }
}

class ArrayDouble extends ArrayValue {
    public readonly matrix!: number[][];

    constructor(cols: number, rows: number);
    constructor(matrix: number[][]);

    constructor(arg1: number | number[][], arg2?: number) {
        super();
        if (Array.isArray(arg1)) {
            this.matrix = arg1;
        } else {
            this.matrix = new Array(arg1).fill(new Array(arg2));
        }
    }

    get Cols(): number {
        return this.matrix[1].length;
    }

    Equals(v: Value): boolean {
        return ArrayValue.EqualsElements(this, v as unknown as ArrayValue);
    }

    Get(col: number, row: number): Value {
        return NumberValue.Make(this.matrix[col][row]);
    }

    get Rows(): number {
        return this.matrix[0].length;
    }

    Slice(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return this.View(ulCa, lrCa);
    }

    View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        const cols: number = this.Cols,
            rows: number = this.Rows,
            col0: number = ulCa.col,
            row0: number = ulCa.row,
            _lrCa = lrCa; // eslint-disable-line @typescript-eslint/no-unused-vars

        const vals: Value[][] = new Array(cols).fill(new Array(rows));
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                vals[i][j] = NumberValue.Make(this.matrix[row0 + j][col0 + i]);
            }
        }
        return new ArrayExplicit(vals) as unknown as Value;
    }

    public override ToDoubleArray2DFast(): number[][] {
        return this.matrix;
    }

    public static Make(v: Value): Value {
        if (v instanceof ArrayDouble) {
            return v as unknown as Value;
        } else if (v instanceof ArrayValue) {
            const arr: ArrayValue = v as unknown as ArrayValue;
            const cols: number = arr.Cols;
            const rows: number = arr.Rows;
            const result: ArrayDouble = new ArrayDouble(cols, rows);
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (result.matrix[i][j]) {
                        arr.Get(i, j);
                    }
                }
            }
            return result as Value;
        } else {
            return ErrorValue.argTypeError as unknown as Value;
        }
    }
}
