import { Value } from "./Value";

export class ObjectValue extends Value {
    // value field:
    public readonly value: unknown | null;

    public static readonly nullObjectValue: ObjectValue = new ObjectValue(null);

    // Constructor:
    public constructor(o: object | unknown) {
        super();
        this.value = o;
    }

    /*
    The Make() method returns a new ObjectValue based on the inputted object if it's not null.
    Otherwise, it returns the nullObjectValue which contains null.
     */
    public static Make(o: unknown): Value {
        if (o === null) {
            return ObjectValue.nullObjectValue;
        }
        return new ObjectValue(o);
    }

    /*
    The ToString() method returns the value of the ObjectValue as a string.
     */
    public ToString(): string {
        return JSON.stringify(this.value); // stringify converts a JavaScript value to a JSON string
    }

    /*
    The ToObject() method returns the value of the ObjectValue as an object
     */
    public override ToObject(): object {
        return this.value as object; // The "as" casts the value as an object, making the method work when value is null as well
    }

    Equals(v: Value): boolean {
        return v.ToObject() === this.value;
    }
}
