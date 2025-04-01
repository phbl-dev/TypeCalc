import type { FullCellAddress } from "./CellAddressing";
import type { Sheet } from "./Sheet";
import type { Value } from "./Value";
import type { Expr } from "./Expressions";

// An IDepend is an object such as Cell, Expr, CGExpr, ComputeCell that can tell what full
// cell addresses it depends on.
export interface IDepend {
    dependsOn(here: FullCellAddress, dependsOn: (addr: FullCellAddress) => void): void;
}

// Indicates whether two objects of the same type T are equivalent used for HashList class
export interface IEquatable<T> {
    equals(other: T): boolean;
}

/**
 * Applier is the delegate type used to represent implementations of built-in functions and
 * sheet-defined functions in the interpretive implementation.
 * @param {Sheet} sheet - The sheet containing the cell in which the function is called.
 * @param {Expression[]} es - The function call's argument expressions
 * @param {number} col - The column containing the cell in which the function is called.
 * @param {number} row - The row containing the cell in which the function is called.
 */
export type Applier = (sheet: Sheet, es: Expr[], col: number, row: number) => Value;

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

// Data structure that preserves insertion order of unique elements
export class HashList<T> implements Iterable<T> {
    private readonly list: T[] = []; // The actual list part of the HashList
    private readonly set: Set<T> = new Set<T>(); // Keeps track of unique items

    /** Checks if a given item exists in the HashList by checking the set.
     *
     * @param item - The item to check for
     */
    public Contains(item: T): boolean {
        return this.set.has(item);
    }

    /** Returns the length of the HashList
     *
     * @returns {number} - length of the HashList
     */
    public Count(): number {
        return this.list.length;
    }

    /** Adds an item to the list and set, unless it already exists in the
     * set. This way we ensure every element of the list is unique.
     *
     * @param item - The item we want to add to the HashList
     * @returns {boolean} false if the item was already in the set, otherwise true.
     */
    public Add(item: T): boolean {
        if (this.set.has(item)) {
            return false;
        } else {
            this.list.push(item);
            this.set.add(item);
            return true;
        }
    }

    /** Applies Add() to every element of a collection xs.
     *
     * @param {Iterable} xs - The collection we want to add elements from
     */
    public AddAll(xs: Iterable<T>): void {
        for (const x of xs) {
            this.Add(x);
        }
    }

    /** Creates a HashList that is a union of two other HashLists
     *
     * @param ha1 {HashList} - the first HashList we want to join
     * @param ha2 {HashList} - the other HashList we want to join
     * @returns the combined HashList
     */
    public static Union<T>(ha1: HashList<T>, ha2: HashList<T>): HashList<T> {
        const result: HashList<T> = new HashList<T>();
        result.AddAll(ha1);
        result.AddAll(ha2);
        return result;
    }

    /** Creates a HashList that is an intersection of two other HashLists
     *
     * @param ha1 {HashList} - the HashList we pick elements from
     * @param ha2 {HashList} - the HashList we compare with
     * @returns the intersecting HashList
     */
    public static Intersection<T>(ha1: HashList<T>, ha2: HashList<T>): HashList<T> {
        const result: HashList<T> = new HashList<T>();
        for (const x of ha1) {
            if (ha2.Contains(x)) {
                result.Add(x);
            }
        }
        return result;
    }

    /** Creates a HashList that contains all the elements of one HashList that
     * aren't present in another HashList.
     *
     * @param ha1 {HashList} - the HashList we take from
     * @param ha2 {HashList} - the HashList we compare with
     * @returns the HashList containing the elements ha1 doesn't share with ha2
     */
    public static Difference<T>(ha1: HashList<T>, ha2: HashList<T>): HashList<T> {
        const result: HashList<T> = new HashList<T>();
        for (const x of ha1) {
            if (!ha2.Contains(x)) {
                result.Add(x);
            }
        }
        return result;
    }

    /** Compares the list of a HashList with the set of a HashList to check if
     * their contents are equal, irrespective of the order in which they appear.
     * </br>First it checks if the HashLists have differing lengths - if so, they cannot
     * be equal, and it returns false. Otherwise, it loops through every element
     * of a list and checks if it is missing in the set of the provided HashList.
     * If it is, it returns false.
     * </br>If both checks are passed it returns true.
     *
     * @param {HashList} that - the HashList we want a set from
     * @returns false if either check fails. Otherwise, true
     */
    public UnsequencedEquals(that: HashList<T>): boolean {
        if (this.Count() != that.Count()) {
            return false;
        }
        for (const x of this.list) {
            if (!that.set.has(x)) {
                return false;
            }
        }
        return true;
    }

    //Defines the behaviour of the iterator extended by HashList
    [Symbol.iterator](): Iterator<T> {
        return this.list[Symbol.iterator]();
    }
}

/** Machinery to cache the creation of objects of type U, when created
 * from objects of type T, and for later access via a number index.
 * </br>Note that the original C# implementation was a sealed class,
 * but TypeScript offers no equivalent method of preventing inheritance.
 *
 * @typeParam T - Type of key, typically string
 * @typeParam U - Type of resulting cached item
 */
export class ValueCache<T, U> {
    private readonly dict: Map<T, number> = new Map<T, number>(); //The value corresponds to an index in the array
    private readonly array: U[] = [];
    private readonly make: (arg1: number, arg2: T) => U; //Function type that converts a number and a type T into a value of type U

    constructor(make: (arg1: number, arg2: T) => U) {
        this.make = make;
    }

    /** Gets the index of x in dict and returns it. If it doesn't exist, we
     * set index to be equal to the array's length and adds it to dict as a
     * value with x as its key.
     * </br>It then calls the make function type and creates an element U
     * using the index and x as parameters. This new element is then added
     * to the end of the array.
     *
     * @param x - the element we want the index of
     * @returns - the index of x
     */
    public GetIndex(x: T): number {
        let index = this.dict.get(x);
        if (index == undefined) {
            index = this.array.length;
            this.dict.set(x, index);
            this.array.push(this.make(index, x));
        }
        return index;
    }

    public this(index: number): U {
        return this.array[index];
    }
}

/** Machinery to store the objects of type T for later access via a
 * number index.
 * </br>Note that the original C# implementation was a sealed class,
 * but TypeScript offers no equivalent method of preventing inheritance.
 * @typeParam T - Type of item stored in the array
 */
export class ValueTable<T> {
    private readonly dict: Map<T, number> = new Map<T, number>();
    private readonly array: T[] = [];

    /** Gets the index of x in dict and returns it. If it doesn't exist,
     * we set index to be equal to the array's length and add x to the
     * array. We also add it to dict as a key, with index as its value.
     * @param x - the element we want the index of
     * @returns - the index of x
     */
    public GetIndex(x: T): number {
        let index = this.dict.get(x);
        if (index == undefined) {
            index = this.array.length;
            this.array.push(x);
            this.dict.set(x, index);
        }
        return index;
    }

    public this(index: number): T {
        return this.array[index];
    }
}
