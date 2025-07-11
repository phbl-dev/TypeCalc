import { FullCellAddress, SuperCellAddress } from "./CellAddressing.ts";
import type { Sheet } from "./Sheet.ts";
import type { Cell } from "./Cells.ts";
import { ValueCache } from "./Types.ts";

/**
 * Abstract class used for subsequent value types.
 * It contains a number of methods, that are inherited by all value types.
 */
export abstract class Value {
    public abstract Equals(v: Value): boolean;

    public static ToObject(v: Value): unknown {
        // OBS: "object" type is different in TypeScript as it is in C#!! Therefore, I changed it to "unknown"
        return Value.ToObject(v);
    }

    /**
     * Returns the Value as an object
     * @constructor
     */
    public abstract ToObject(): unknown;

    /**
     * Applies the provided action to the current instance.
     */
    public Apply(act: (value: Value) => void): void {
        act(this);
    }

    /**
     * Convert Value type to boolean type.
     * @param value
     * @constructor
     */
    public static ToBoolean(value: Value): boolean {
        if (value instanceof BooleanValue) {
            return value.value;
        } else if (value instanceof NumberValue) {
            return (value as NumberValue).value !== 0;
        } else if (value instanceof TextValue) {
            const text = TextValue.ToString(value);
            return text !== null && text!.toLowerCase() === "true";
        }
        return false;
    }

    /**
     * Create a new blank string value
     * @constructor
     */
    public static MakeVoid(): Value {
        return this.createTextValue();
    }

    private static createTextValue(): Value {
        return new (require("../src/TextValue").TextValue.VOID)(); // Dynamically import BlankCell
    }
}

/**
 * Represents an error value that extends the base `Value` class.
 * This class provides error handling and representation functionality,
 * including error message management, indexing, creation, and equality checks.
 * To store error more efficient, we make use of a map like structure.
 */
export class ErrorValue extends Value {
    public readonly message: string;
    public readonly index: number;

    public static readonly errorTable: ValueCache<string, ErrorValue> =
        new ValueCache<string, ErrorValue>(
            (index: number, message: string): ErrorValue =>
                new ErrorValue(message, index),
        );

    public static readonly numError: ErrorValue = this.Make("#NUM!");
    public static readonly argTypeError: ErrorValue =
        this.Make("#ERR: ArgType!");
    public static readonly nameError: ErrorValue = this.Make("#NAME?");
    public static readonly refError: ErrorValue = this.Make("#REF!");
    public static readonly cycleError: ErrorValue = this.Make("#CYCLE!");
    public static readonly valueError: ErrorValue = this.Make("#VALUE!");
    public static readonly naError: ErrorValue = this.Make("#NA");
    private constructor(message: string, errorIndex: number) {
        super();
        this.message = message;
        this.index = errorIndex;
    }

    /**
     * Get index of string in map if it exists
     * @param message
     * @constructor
     */
    public static GetIndex(message: string): number {
        return ErrorValue.errorTable.getIndex(message);
    }

    /**
     * Create a NaN value.
     * @constructor
     */
    public ErrorNan(): number {
        return ErrorValue.MakeNan(this.index);
    }

    public static FromNan(d: number): ErrorValue {
        return this.errorTable.get(ErrorValue.ErrorCode(d));
    }

    public static FromIndex(errorIndex: number): ErrorValue {
        return this.errorTable.get(errorIndex);
    }

    /**
     * Constructor for ErrorValue
     * @param message
     * @constructor
     */
    public static Make(message: string): ErrorValue {
        return this.errorTable.get(this.errorTable.getIndex(message));
    }
    public Equals(v: Value): boolean {
        return (v as ErrorValue) && (v as ErrorValue).index == this.index;
    }

    public ToObject(): unknown {
        return this as unknown;
    }

    public ToString(): string {
        return this.message;
    }

    /**
     * Creates a custom NaN (Not-a-Number) value where specific bits are modified to encode an error index.
     */
    public static MakeNan(errorIndex: number): number {
        // Get NaN's bit pattern
        const nanBits = new Float64Array([Number.NaN]);
        const dataView = new DataView(nanBits.buffer);

        // Read NaN as 64-bit integer
        let bits = dataView.getBigInt64(0, true);

        // Apply the error index
        bits |= BigInt(errorIndex);

        // Convert back to floating point
        dataView.setBigInt64(0, bits, true);
        return nanBits[0];
    }

    /**
     * Generate ErrorCode from number
     * @param d
     * @constructor
     */
    public static ErrorCode(d: number): number {
        // Convert the number to its 64-bit representation
        const buffer = new ArrayBuffer(8); // 8 bytes (64 bits)
        const dataView = new DataView(buffer);

        // Store the number's bits as a 64-bit integer
        dataView.setFloat64(0, d, true);

        // Read the bits as an int64
        const bits = dataView.getBigInt64(0, true);

        // Convert to int and return
        return Number(bits & BigInt(0xffffffffffffffffn));
    }
}

/**
 * Represents a boolean value, encapsulating various operations and functionalities
 * related to boolean values. This class inherits from the base `Value` class.
 */
export class BooleanValue extends Value {
    public readonly value: boolean;

    public static readonly type: typeof BooleanValue = BooleanValue;

    // Defining the constructor:
    private constructor(s: boolean) {
        super(); // Calling the parent constructor
        this.value = s; // Setting value to be the argument given in s
    }

    Equals(v: Value): boolean {
        if (v instanceof BooleanValue) {
            return this.value === v.value;
        }
        return false;
    }

    ToObject(): unknown {
        return this.value;
    }

    public static Make(s: boolean): BooleanValue {
        if (s === null) {
            throw new Error("s cannot be null");
        }
        return new BooleanValue(s);
    }
}

/*
The TextValue class represents the value of a cell when it contains a string. It ensures that identical text
values are stored only once (interning). So if two different cells store the same string value then each of
the cells in the ValueCache hold a reference to the TextValue containing that string.
 */
export class TextValue extends Value {
    public readonly value: string;

    /*
    The "type" property sets the type of TextValue to be TextValue.
    "static" makes the property shared across all class instances.
    "readonly" makes property immutable.
     */
    public static readonly type: typeof TextValue = TextValue;

    // Defining the constructor:
    private constructor(s: string) {
        super(); // Calling the parent constructor
        this.value = s; // Setting value to be the argument given in s
    }

    /*
    Creating an instance of ValueCache with string as key and a TextValue instance as value.
    The textValueCache is used to store TextValue instances, and they will be stored with a string key.
     */
    private static textValueCache: ValueCache<string, TextValue> =
        new ValueCache<string, TextValue>(
            (index: number, s: string) => new TextValue(s),
        );

    /*
    Adds an EMPTY property to the TextValue. Since it's static it will be shared across all instances.
    This property represents a state that a TextValue can be in when it contains an empty string.
    It isn't strictly necessary because even without the EMPTY property the interning mechanism would
    still ensure that all cells with an empty string would refer to the same TextValue.
     */
    public static readonly EMPTY: TextValue = TextValue.MakeInterned("");

    public static readonly NULL: TextValue = TextValue.MakeInterned("NULL");

    /*

     */
    public static readonly VOID: TextValue = TextValue.MakeInterned("<void>");

    /*
     The GetIndex() method returns the index of the TextValue in textValueCache that matches the key "s".
     - It uses the ValueCache class' own getIndex() method.
     - If "s" is not in the textValueCache, the getIndex() method makes sure to add it.
     */
    public static GetIndex(s: string): number {
        return TextValue.textValueCache.getIndex(s);
    }

    /*
    The MakeInterned() method returns the actual TextValue in textValueCache that matches the key "s".
    - If "s" is not in the textValueCache, the getIndex() method makes sure to add it.
     */
    public static MakeInterned(s: string): TextValue {
        return TextValue.textValueCache.get(
            TextValue.textValueCache.getIndex(s),
        );
    }

    /*
    The make() method takes an argument of type string "s" and returns a new TextValue object with "s".
    - If "s" is an empty string it returns the shared EMPTY property.
    - If "s" is null an error will be thrown.
     */
    public static Make(s: string): TextValue {
        if (s === null) {
            throw new Error("s cannot be null");
        } else if (s === "") {
            return TextValue.EMPTY;
        } else {
            return new TextValue(s);
        }
    }

    /*
    The FromIndex() method takes an argument "index" of type number and returns the TextValue
    from at the index of the textValueCache.
     */
    public static FromIndex(index: number): TextValue {
        return this.textValueCache.array[index];
    }

    /*
    The FromString() method takes "o" as argument of type unknown.
    - If "o" is a string new TextValue is returned.
    - Else an error is returned.
     */
    public static FromString(o: unknown): Value {
        if (typeof o === "string") {
            return TextValue.Make(o);
        } else {
            return ErrorValue.argTypeError;
        }
    }

    /*
    The ToString() method takes "v" as argument of type Values.
    It then attempts to cast "v" as a TextValue and calls it "tv".
    - If "tv" is not null its value is returned.
    - Otherwise, null is returned.
     */
    public static ToString(v: Value): string | null {
        const tv = v as TextValue;
        if (tv !== null) {
            return tv.value;
        } else {
            return null;
        }
    }

    /*
    The Equals() method is used to determine if two TextValue objects represent the same value.
    For example, if both have the same string stored in their value property, they would be considered equal.
     */
    public override Equals(v: Value): boolean {
        if (v instanceof TextValue) {
            return v.value === this.value;
        }
        return false;
    }

    /*
        The ToObject() method returns the value of the TextValue as an unknown type.
         */
    public override ToObject(): unknown {
        return this.value;
    }
}

/**
 * NumberValue is the designated way to handle numbers in ExcellentTS
 * The implementation draws heavy inspiration from CoreCalc, and is heavily simplified at the same time with TypeScript number type.
 * @see {@link Make} - Creates a new NumberValue instance and returns the instance to the user.
 * This is the correct way to create a new NumberValue object
 * @see {@link ToNumber} - The way to convert a NumberValue type to an object
 * @see {@link FromNumber} - The way to convert an object to a NumberValue type
 */
export class NumberValue extends Value {
    public readonly value: number;

    // Class constants
    public static readonly ZERO = new NumberValue(0);
    public static readonly ONE = new NumberValue(1);
    public static readonly PI = new NumberValue(Math.PI);

    private constructor(value: number) {
        super();
        if (Number.isFinite(value as number) && !Number.isNaN(value)) {
            this.value = value;
        } else {
            throw new Error(`Invalid value provided: ${value}`);
        }
    }

    /**
     * The Make method creates a new NumberValue instance and returns the resulting cell.
     * @param d - Input value of type number.
     * Supports signed and unsigned values ranging from a singular bit to 64 bits. Input must be finite and cannot be null!
     * @constructor
     * @return Value - the resulting NumberValue as type Values
     */
    public static Make(d: number): Value {
        if (!Number.isFinite(Number(d))) {
            return ErrorValue.numError;
        }
        if (Number.isNaN(Number(d))) {
            return ErrorValue.FromNan(Number(d));
        }
        if (d === 0) {
            return NumberValue.ZERO as Value;
        }
        if (d === 1) {
            return NumberValue.ONE as Value;
        }
        return new NumberValue(Number(d)) as Value;
    }

    /**
     *
     * @param v another type of Values
     * @constructor
     * @return whether or not two NumberValues are equal
     */
    public override Equals(v: Value): boolean {
        return v instanceof NumberValue && v.value === this.value;
    }

    /**
     * returns the inner number value as an object value.
     * I.e, if 10 is the value of the object, then it will return 10.
     * @constructor
     */

    public override ToObject(): object {
        return this.value as unknown as object;
    }

    /**
     * Implementation for ToX methods from CoreCalc implementation.
     * Since TS/JS uses the type: number for every value that is less than 64bit,
     * it can parse all other values that are less than this. For numbers larger than this, we use the BigInt type.
     * @param v - the value to be parsed
     * @constructor
     */
    public static ToNumber(v: Value): number | null {
        const nv = v as NumberValue;
        return nv != null ? nv.value : null;
    }

    /**
     * The method that converts an object  into a value.
     * For more info {@link ToNumber}
     * @param o - the object to be parsed into a value
     * @constructor
     */

    public static FromNumber(o: object): Value | null {
        if (o instanceof Number) {
            return this.Make(o as number);
        } else {
            return ErrorValue.numError;
        }
    }

    /**
     * Used to work with dates in NumberValues
     * @private
     */
    private static readonly basedate: number = new Date(1899, 12, 30).getTime();
    private static readonly daysPerTick = 1000 * 60 * 60 * 24;

    /**
     * Shows the number of ticks since Jan 1 1970
     * @param ticks
     * @constructor
     */
    public static DoubleFromDateTimeTicks(ticks: number | bigint): number {
        return ((ticks as number) - this.basedate) / this.daysPerTick;
    }

    public ToString(): string {
        return this.value.toString();
    }
    public static FromBoolean(o: object): Value | null {
        if (o instanceof Boolean) {
            return o.valueOf() ? this.ONE : this.ZERO;
        } else {
            return ErrorValue.numError as Value;
        }
    }
}

/**
 * Represents an abstract class for working with multidimensional array values.
 * Inherits from the `Value` class and provides methods and properties to handle array-like data structure.
 * Subclasses must implement abstract methods defined in this class.
 */
export abstract class ArrayValue extends Value {
    public static readonly Type = typeof ArrayValue;

    public abstract get Cols(): number;

    public abstract get Rows(): number;

    /**
     * @param ca - a SuperCellAddress.
     * @returns A value
     */
    public get(ca: SuperCellAddress): Value {
        // Call the Get method with the appropriate coordinates
        return this.Get(ca.col, ca.row);
    }

    public abstract Get(col: number, row: number): Value;

    public override ToObject(): object {
        return this;
    }
    public abstract View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value;

    public abstract Slice(
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
    ): Value;

    /**
     * Performs a slice on an ArrayValue area. This means that we generate two corner locations based on the inserted coordinates.
     * The first corner is the upper left corner of the area. The second corner is the lower right corner of the area.
     * The area is then sliced based on the two corners.
     *
     * @param r1
     * @param c1
     * @param r2
     * @param c2
     * @constructor
     */
    public SliceMethod(r1: number, c1: number, r2: number, c2: number): Value {
        const ir1: number = r1 - 1;
        const ic1: number = c1 - 1;
        const ir2: number = r2 - 1;
        const ic2: number = c2 - 1;

        if (
            0 <= ir1 &&
            ir1 <= ir2 + 1 &&
            ir2 < this.Rows &&
            0 <= ic1 &&
            ic1 <= ic2 + 1 &&
            ic2 < this.Cols
        ) {
            return this.Slice(
                new SuperCellAddress(ic1, ir1),
                new SuperCellAddress(ic2, ir2),
            );
        } else {
            return ErrorValue.refError;
        }
    }

    /**
     * Check if two ArrayValue are the same.
     * This returns true if the two arrays have the same dimensions and the same values in the same positions.
     *
     * @param arr1
     * @param arr2
     * @constructor
     */
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
    public ToString(): string {
        const sb: string[] = [];
        for (let i = 0; i < this.Rows; i++) {
            for (let j = 0; j < this.Cols; j++) {
                const v: Value = this.Get(j, i);
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

/**
 * Represents a specific view or subset of a two-dimensional array or grid located on a sheet.
 * The array is defined by a starting upper-left cell and an ending lower-right cell.
 * Provides methods to access and manipulate parts of the array data.
 */
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

    /**
     * Create an ArrayView using two SuperCellAddress objects.
     * @param ulCa
     * @param lrCa
     * @param sheet
     * @constructor
     */
    public static Make(
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
        sheet: Sheet,
    ): ArrayView {
        const result: { ulCa: SuperCellAddress; lrCa: SuperCellAddress } =
            SuperCellAddress.normalizeArea(ulCa, lrCa);
        return new ArrayView(result.ulCa, result.lrCa, sheet);
    }

    get Cols(): number {
        return this.cols;
    }

    get Rows(): number {
        return this.rows;
    }

    /**
     * Retrieves a cell address from within the ArrayView.
     * @param col
     * @param col
     * @param row
     * @constructor
     */
    public override Get(col: number, row: number): Value {
        if (0 <= col && col < this.Cols && 0 <= row && row < this.Rows) {
            const c = this.ulCa.col + col,
                r = this.ulCa.row + row;
            const cell: Cell | null = this.sheet.Get(c, r);
            if (cell != null) {
                return cell.Eval(this.sheet, c, r)!;
            } else {
                return TextValue.VOID;
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
            return (
                this.sheet == arg1.sheet &&
                this.ulCa.equals(arg1.ulCa) &&
                this.lrCa.equals(arg1.lrCa)
            );
        } else if (arg1 instanceof Value) {
            return (
                arg1 instanceof ArrayValue && this.Equals(arg1 as ArrayValue)
            );
        } else {
            return arg1 instanceof ArrayView && this.Equals(arg1 as object);
        }
    }

    /**
     * Applies a given action to each value in a defined range.
     */
    public Apply(act: ((val: Value) => void) | ((val: number) => void)): void {
        const col0: number = this.ulCa.col,
            row0 = this.ulCa.row;

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const value: Value = new FullCellAddress(
                    this.sheet,
                    null,
                    col0 + c,
                    row0 + r,
                ) as unknown as Value;
                (act as (val: Value) => void)(value);
            }
        }
    }

    /**
     * Perform a slice on an ArrayView area. This means that we generate two corner locations based on the inserted coordinates.
     * @param ulCa
     * @param lrCa
     * @constructor
     */
    Slice(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return new ArrayView(
            ulCa.offset(this.ulCa),
            lrCa.offset(this.lrCa),
            this.sheet,
        ) as Value;
    }

    View(ulCa: SuperCellAddress, lrCa: SuperCellAddress): Value {
        return ArrayView.Make(
            ulCa.offset(this.ulCa),
            lrCa.offset(this.lrCa),
            this.sheet,
        ) as Value;
    }
}

/**
 * Represents a multidimensional array with explicit handling of cell addresses
 * for upper-left (UL) and lower-right (LR) corners and provides various operations
 * for accessing and manipulating its components.
 */
export class ArrayExplicit extends ArrayValue {
    public ulCellAddress!: SuperCellAddress;
    public lrCellAddress!: SuperCellAddress;
    private cols!: number;
    private rows!: number;
    public values!: Value[][];

    override get Cols(): number {
        return this.cols;
    }

    constructor(values: Value[][]);
    constructor(
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
        values: Value[][],
    );

    constructor(
        arg1: SuperCellAddress | Value[][],
        arg2?: SuperCellAddress,
        arg3?: Value[][],
    ) {
        super();
        if (Array.isArray(arg1)) {
            const values = arg1;
            const ulCa = new SuperCellAddress(0, 0);
            const lrCa = new SuperCellAddress(
                values.length - 1,
                values[0].length - 1,
            );
            this.init(ulCa, lrCa, values);
        } else if (arg2 && arg3) {
            this.init(arg1, arg2, arg3);
        } else {
            throw new Error("Invalid constructor arguments.");
        }
    }

    private init(
        ulCa: SuperCellAddress,
        lrCa: SuperCellAddress,
        values: Value[][],
    ): void {
        this.ulCellAddress = ulCa;
        this.lrCellAddress = lrCa;
        this.values = values;
        this.cols = this.lrCellAddress.col - this.ulCellAddress.col + 1;
        this.rows = this.lrCellAddress.row - this.ulCellAddress.row + 1;
    }

    Equals(v: Value): boolean {
        return ArrayValue.EqualsElements(this, v as ArrayValue);
    }

    override Get(col: number, row: number): Value {
        if (0 <= col && col < this.Cols && 0 <= row && row < this.Rows) {
            return this.values[col][row];
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
        return new ArrayExplicit(
            ulCa.offset(this.ulCellAddress),
            lrCa.offset(this.lrCellAddress),
            this.values,
        ) as Value;
    }
}
