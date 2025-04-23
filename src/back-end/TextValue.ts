import { Value, hashCode } from "./Value";
import { ValueCache, ErrorValue } from "./ErrorValue";

/*
The TextValue class represents the value of a cell when it contains a string. It ensures that identical text
values are stored only once (interning). So if two different cells store the same string value then each of
the cells in the ValueCache hold a reference to the TextValue containing that string.
 */
export class TextValue extends Value {
    public readonly value: string | undefined;

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
    private static textValueCache: ValueCache<string, TextValue> = new ValueCache<string, TextValue>((index: number, s: string) => new TextValue(s));

    /*
    Adds an EMPTY property to the TextValue. Since it's static it will be shared across all instances.
    This property represents a state that a TextValue can be in when it contains an empty string.
    It isn't strictly necessary because even without the EMPTY property the interning mechanism would
    still ensure that all cells with an empty string would refer to the same TextValue.
     */
    public static readonly EMPTY: TextValue = TextValue.MakeInterned("");

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
        return TextValue.textValueCache.get(TextValue.textValueCache.getIndex(s));
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
    The ToString() method takes "v" as argument of type Value.
    It then attempts to cast "v" as a TextValue and calls it "tv".
    - If "tv" is not null its value is returned.
    - Otherwise, null is returned.
     */
    public static ToString(v: Value): string | undefined | null {
        const tv = v as TextValue;
        if (tv !== null) {
            return tv.value;
        } else {
            return null;
        }
    }

    /*
    The FromNakedChar() method takes "c" as argument of type number.
    - It returns a TextValue based on "c" which is converted to a string.
     */
    public static FromNakedChar(c: number): Value {
        return TextValue.Make(c.toString());
    }

    /*
    The ToNakedChar() method takes "v" as argument of type TextValue.
    - Then, if the value of "v" is not null or undefined, and the length of the value is at least 1,
    it returns the first character of the TextValue "v" as a string.
    - Otherwise, it returns the string '\0'.
     */
    public static ToNakedChar(v: TextValue): string {
        if (v.value && v.value.length >= 1) {
            return v.value[0];
        } else {
            return "\0";
        }
    }

    /*
    The FromChar() method takes an argument "o" of type unknown.
    - If it "o" has the same characteristics as a character then we return a TextValue made from "o"
    - Otherwise, an error is returned.
     */
    public static FromChar(o: unknown): Value {
        if (typeof o === "string" && o.length === 1) {
            return TextValue.Make(o);
        } else {
            return ErrorValue.argTypeError;
        }
    }

    /*
    The ToChar() method takes "v" as argument of type Value.
    It then attempts to cast "v" as a TextValue and calls it "tv".
    - If tv is not null and its values is not undefined and it has a length of at least 1 then it returns the first character of the value.
    - Otherwise it returns null.
     */
    public static ToChar(v: Value): string | null {
        const tv = v as TextValue;
        if (tv !== null && tv.value !== undefined && tv.value.length >= 1) {
            return tv.value[0];
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
    The GetHashCode() method returns the hash code for the TextValue's value.
    If the value is not null and not undefined it hashes it.
    Otherwise, it hashes "undefined".
     */
    public GetHashCode(): number {
        if (this.value != null) {
            // Test that value is neither null nor undefined because "!=" is not strict.
            return hashCode(this.value);
        } else {
            return hashCode("undefined");
        }
    }

    /*
    The ToObject() method returns the value of the TextValue as an unknown type.
     */
    public override ToObject(): unknown {
        return this.value;
    }

    /*
    The ToString() method string of the TextValue's value.
    If the value is not null and not undefined it returns the string.
    Otherwise, it returns "undefined".
     */
    public ToString(): string {
        if (this.value != null) {
            // Test that value is neither null nor undefined because "!=" is not strict.
            return this.value;
        } else {
            return "undefined";
        }
    }
}

