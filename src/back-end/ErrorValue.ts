import { Value } from "./Value";

/*
    The ValueCache class is where we store contents of cells temporarily.
    We use a Map with T as a placeholder for the key and U as a placeholder for the value.
    We use a cache to efficiently retrieve data from frequently used cells.
 */
export class ValueCache<T, U> {
  private readonly dict: Map<T, number> = new Map();
  public readonly array: U[] = []; // OBS. This was changed from private to public due to the FromIndex() method in TextValue.ts
  private readonly make: (index: number, key: T) => U;

  constructor(make: (index: number, key: T) => U) {
    this.make = make;
  }

  /*
    The getIndex() method returns the index of the key if the key exists in the dictionary.
    If the key doesn't exist it adds it to the dictionary and adds the corresponding value to the array.
    and then return the newly added index from the dictionary.
     */
  public getIndex(key: T): number {
    if (!this.dict.has(key)) {
      const index = this.array.length;
      this.dict.set(key, index);
      this.array.push(this.make(index, key));
    }
    return this.dict.get(key)!;
  }

  public get(index: number): U {
    return this.array[index];
  }
}

export class ErrorValue extends Value {
  // OBS: exporting this class to enable import in TextValue.ts
  public readonly message: string;
  public readonly index: number;

  public static readonly errorTable: ValueCache<string, ErrorValue> =
    new ValueCache<string, ErrorValue>(
      (index: number, message: string): ErrorValue =>
        new ErrorValue(message, index),
    );

  public static readonly numError: ErrorValue = this.Make("#NUM!");
  public static readonly argCountError: ErrorValue =
    this.Make("#ERR: ArgCount");
  public static readonly argTypeError: ErrorValue = this.Make("#ERR: ArgType!");
  public static readonly nameError: ErrorValue = this.Make("#NAME?");
  public static readonly refError: ErrorValue = this.Make("#REF!");
  public static readonly cycleError: ErrorValue = this.Make("#CYCLE!");
  public static readonly valueError: ErrorValue = this.Make("#VALUE!");
  public static readonly naError: ErrorValue = this.Make("#NA");
  public static readonly tooManyArgsError: ErrorValue = this.Make(
    "#ERR: Too many arguments",
  );

  private constructor(message: string, errorIndex: number) {
    super();
    this.message = message;
    this.index = errorIndex;
  }

  public static GetIndex(message: string): number {
    return ErrorValue.errorTable.getIndex(message);
  }

  public ErrorNan(): number {
    return ErrorValue.MakeNan(this.index);
  }
  public static FromNan(d: number): ErrorValue {
    return this.errorTable.get(ErrorValue.ErrorCode(d));
  }

  public static FromIndex(errorIndex: number): ErrorValue {
    return this.errorTable.get(errorIndex);
  }

  public static Make(message: string): ErrorValue {
    return this.errorTable.get(this.errorTable.getIndex(message));
  }

  public Equals(v: Value): boolean {
    return (v as ErrorValue) && (v as ErrorValue).index == this.index;
  }

  public GetHashCode(): number {
    return this.index;
  }

  public ToObject(): unknown {
    return this as unknown;
  }

  public ToString(): string {
    return this.message;
  }

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

  public static ErrorCode(d: number): number {
    // Convert the number to its 64-bit representation
    const buffer = new ArrayBuffer(8); // 8 bytes (64 bits)
    const dataView = new DataView(buffer);

    // Store the number's bits as a 64-bit integer
    dataView.setFloat64(0, d, true); // true for little-endian byte order

    // Read the bits as an int64
    const bits = dataView.getBigInt64(0, true);

    // Convert to int and return
    return Number(bits & BigInt(0xffffffffffffffffn));
  }
}
