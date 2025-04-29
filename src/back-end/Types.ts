import type {FullCellAddress} from "./CellAddressing";


// Signals that a cyclic dependency is discovered during evaluation.
export class CyclicException extends Error {
    public readonly culprit: FullCellAddress;

    constructor(msg: string, culprit: FullCellAddress) {
        super(msg); //corresponds to base(msg) in C#
        this.name = "CyclicException"; //Names error properly rather than generic Error
        this.culprit = culprit;
    }
}

// Signals a violation of internal consistency assumptions in the spreadsheet implementation.
export class ImpossibleException extends Error {
    constructor(msg: string) {
        super(msg); //corresponds to base(msg) in C#
        this.name = "ImpossibleException"; //Names error properly rather than generic Error
    }
}

// Signals that something could have been implemented but wasn't.
export class NotImplementedException extends Error {
    constructor(msg: string) {
        super(msg); //corresponds to base(msg) in C#
        this.name = "NotImplementedException"; //Names error properly rather than generic Error
    }
}

export class Formats {
    //TypeScript does not support enums inside classes, so we will use a static class instead
    static Reftype = class {
        static readonly A1: string = "A1";
        static readonly C0R0: string = "C0R0";
        static readonly R1C1: string = "R1C1";
    };

    private showFormulas = false;
    private refFmt: keyof typeof Formats.Reftype = "A1";
    private argDelim = ",";
    private rangeDelim = ":";

    public getRefFmt(): keyof typeof Formats.Reftype {
        return this.refFmt;
    }
    public setRefFmt(value: keyof typeof Formats.Reftype): void {
        this.refFmt = value;
    }

    public getRangeDelim(): string {
        return this.rangeDelim;
    }
    public setRangeDelim(value: string): void {
        this.rangeDelim = value;
    }

    public getArgDelim(): string {
        return this.argDelim;
    }
    public setArgDelim(value: string): void {
        this.argDelim = value;
    }

    public getShowFormulas(): boolean {
        return this.showFormulas;
    }
    public setShowFormulas(value: boolean): void {
        this.showFormulas = value;
    }
}

export class HashBag<T> implements Iterable<T> {
    private readonly multiplicity: Map<T, number> = new Map<T, number>();

    /** We first set number to either be the value of the key 'item' or 0, if the key doesn't
     * exist. Regardless of the result, we then set the key-value pair in multiplicity with
     * the item as the key and the value as the count incremented by 1.
     * </br>This way we either increment the existing key's value or we create a new entry
     * with a value of 1.
     * @returns {boolean} Always returns 'true'.
     */
    Add(item: T): boolean {
        const count: number = this.multiplicity.get(item) || 0;
        this.multiplicity.set(item, count + 1);
        return true;
    }

    /** Removes an item from multiplicity by first checking if the item already exists as
     * a key by checking if it has a value, as an existing key always will. If it doesn't,
     * i.e., the value is undefined, then the function does nothing.
     * </br>If it does exist, we decrement the value and check if it is now 0. If so, the
     * is deleted from multiplicity. Otherwise, we put it back in multiplicity with the
     * decremented value.
     * @returns {boolean} Returns 'true' if the item exists in multiplicity, otherwise returns
     * 'false'.
     */
    Remove(item: T): boolean {
        let value = this.multiplicity.get(item);
        if (value != undefined) {
            value -= 1;
            if (value == 0) this.multiplicity.delete(item);
            else this.multiplicity.set(item, value);
            return true;
        } else return false;
    }

    /** Applies the Add() function to every element of a collection xs.
     * @param {Iterable} xs - An iterable collection of objects of type T
     */
    AddAll(xs: Iterable<T>): void {
        for (const x of xs) {
            this.Add(x);
        }
    }

    /** Applies the Remove() function to every element of a collection xs.
     * @param {Iterable} xs - An iterable collection of objects of type T
     */
    RemoveAll(xs: Iterable<T>): void {
        for (const x of xs) {
            this.Remove(x);
        }
    }

    /** Yields every entry in multiplicity one at a time.
     * @yields {Iterable<[key,value]>} - an entry in multiplicity
     */
    *ItemMultiplicities(): Iterable<[T, number]> {
        for (const [key, value] of this.multiplicity.entries()) {
            yield [key, value];
        }
    }

    //Clears the contents of multiplicity
    Clear(): void {
        this.multiplicity.clear();
    }

    /** Loops through multiplicity, yielding every key a number of times equal
     * to its value.
     * @yields {Iterator} - a key in multiplicity, yielded a number of times
     * equal to its value
     */
    *GetEnumerator(): Iterator<T> {
        for (const [key, value] of this.multiplicity.entries()) {
            for (let i = 0; i < value; i++) {
                yield key;
            }
        }
    }

    [Symbol.iterator](): Iterator<T> {
        return this.GetEnumerator();
    }
}
/**
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

    /**
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