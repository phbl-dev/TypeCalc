import { Value } from "./Value";
import { ErrorValue } from "./ErrorValue";

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
        if (isFinite(value as number) && !isNaN(value)) {
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
     * @return Value - the resulting NumberValue as type Value
     */
    public static Make(d: number): Value {
        if (!isFinite(Number(d))) {
            return ErrorValue.numError;
        } else if (isNaN(Number(d))) {
            return ErrorValue.FromNan(Number(d));
        } else if (d == 0) {
            return NumberValue.ZERO as Value;
        } else if (d == 1) {
            return NumberValue.ONE as Value;
        } else {
            return new NumberValue(Number(d)) as Value;
        }
    }

    /**
     *
     * @param v another type of Value
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
     * Since TS/JS utilises the type: number for every value, that is less than 64bit,
     * it can parse all other values that are less than this. For numbers larger than this, we use the BigInt type.
     * @param v - the value to be parsed
     * @constructor
     */
    public static ToNumber(v: Value): object | null { // Should 'object' maybe be 'number' instead?
        const nv = v as NumberValue;
        return nv != null ? (nv.value as unknown as object) : null;
    }

    /**
     * The method that converts an object into a value.
     * For more info {@link ToNumber}
     * @param o - the object to be parsed into a value
     * @constructor
     */

    public static FromNumber(o: object): Value | null {
        if (o instanceof Number) {
            return this.Make(o as unknown as number);
        } else {
            return ErrorValue.numError;
        }
    }

    private static readonly basedate: number = new Date(1899, 12, 30).getTime();
    private static readonly daysPerTick = 1000 * 60 * 60 * 24;

    // Cannot be tested. Uses the current date.
    public static DoubleFromDateTimeTicks(ticks: number | bigint): number {
        return (ticks as number - this.basedate) * this.daysPerTick;
    }

    // tested internally.
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

    public static ToBoolean(v: Value): object | null {
        const nv: NumberValue = v as NumberValue;

        return nv != null ? <object>(<unknown>(<number>nv.value != 0)) : null;
    }
}
