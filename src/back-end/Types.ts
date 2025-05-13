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

export enum Reftype {
    A1 = "A1",
    C0R0 = "C0R0",
    R1C1 = "R1C1"
}

/**
 * Class for storing formats in the spreadsheet.
 * @constructor
 * @param showFormulas
 * @param refFmt
 * @param argDelim
 * @param rangeDelim
 */
export class Formats {
    private showFormulas = false;
    private refFmt: Reftype = Reftype.A1;
    private argDelim = ",";
    private rangeDelim = ":";

    public getRefFmt(): Reftype {
        return this.refFmt;
    }
    public setRefFmt(value: Reftype): void {
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