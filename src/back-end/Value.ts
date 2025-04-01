
export function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    return h & 0xffffffff;
}

export abstract class Value {
    public abstract Equals(v: Value): boolean;

    public static ToObject(v: Value): unknown {
        // OBS: "object" type is not the same in TypeScript as it is in C#!! Therefore, I changed it to "unknown"
        return Value.ToObject(v);
    }

    public abstract ToObject(): unknown;

    public Apply(act: (value: Value) => void): void {
        act(this);
    }

    public static MakeVoid(): Value {
        return this.createTextValue();
    }

    private static createTextValue(): Value {
        return new (require("../src/TextValue").TextValue.VOID)(); // Dynamically import BlankCell
    }

}
