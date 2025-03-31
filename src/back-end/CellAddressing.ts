import type { Formats } from "./Types";
import type { Sheet } from "./Sheet";
import type { Value } from "./Value";
import type { Cell } from "./Cells";

//An interval represents a range of numbers from a min to a max, including both
export class Interval {
    readonly min: number;
    readonly max: number;

    constructor(min: number, max: number) {
        if (min > max) {
            throw new Error("min must be less than or equal to max -pekd");
        }
        this.min = min;
        this.max = max;
    }

    //Applies some function to every number in the interval
    forEach(act: (n: number) => void): void {
        for (let i = this.min; i <= this.max; i++) {
            act(i);
        }
    }

    //Returns a boolean value depending on whether the parameter number is in the interval
    contains(i: number): boolean {
        return this.min <= i && i <= this.max;
    }

    //Returns length of the interval
    length(): number {
        return this.max - this.min + 1;
    }

    //Checks whether two intervals overlap
    overlaps(that: Interval): boolean {
        return (this.min <= that.min && that.min <= this.max) || (that.min <= this.min && this.min <= that.max);
    }

    //If the intervals overlap, this is the union:
    union(that: Interval): Interval {
        if (!this.overlaps(that)) {
            throw new Error("The intervals must overlap to use union this way -pekd");
        }
        return new Interval(Math.min(this.min, that.min), Math.max(this.max, that.max));
    }

    //If the intervals overlap, this is the intersection:
    intersect(that: Interval): Interval {
        if (!this.overlaps(that)) {
            throw new Error("The intervals must overlap to use intersect this way -pekd");
        }
        return new Interval(Math.max(this.min, that.min), Math.min(this.max, that.max));
    }

    //Checks for equality between two intervals
    equals(that: Interval): boolean {
        return this.min == that.min && this.max == that.max;
    }
}

//Adjusted is used to represent an adjusted expression or reference, for use in method InsertRowCols //REVISIT LATER
export class Adjusted<Type> {
    readonly type: Type; // The adjusted expression or reference
    readonly maxValidRow: number; // Adjustment is invalid for rows >= maxValidRow
    readonly isUnchanged: boolean; // Indicates if the adjustment is identical to the original

    constructor(type: Type, maxValidRow: number = Number.MAX_SAFE_INTEGER, isUnchanged = true) {
        this.type = type;
        this.maxValidRow = maxValidRow;
        this.isUnchanged = isUnchanged;
    }
}

//RARef = Relative or Absolute cell Reference
export class SuperRARef {
    colAbs: boolean;
    colRef: number;
    rowAbs: boolean;
    rowRef: number;

    //No constructor overloading in TypeScript, so we will try with inheritance
    constructor(colAbs: boolean, colRef: number, rowAbs: boolean, rowRef: number) {
        this.colAbs = colAbs;
        this.colRef = colRef;
        this.rowAbs = rowAbs;
        this.rowRef = rowRef;
    }

    isAToZ(c: string): boolean {
        return ("a" <= c && c <= "z") || ("A" <= c && c <= "Z");
    }

    aToZValue(c: string): number {
        return (c.charCodeAt(0) - "A".charCodeAt(0)) % 32;
    }

    parseIntWithIndex(s: string, i: number): { value: number; index: number } {
        let val = 0;
        let negative = false;

        // Handle optional sign
        if (i < s.length && (s[i] === "-" || s[i] === "+")) {
            negative = s[i] === "-";
            i++;
        }

        // Parse the digits
        while (i < s.length && !isNaN(Number(s[i]))) {
            val = val * 10 + Number(s[i]);
            i++;
        }

        // Return the result with updated index
        return { value: negative ? -val : val, index: i };
    }

    //Get the absolute address of reference
    address(col: number, row: number): RARefCellAddress {
        return new RARefCellAddress(this, col, row);
    }

    insertRowCols(R: number, N: number, r: number, insertRow: boolean): Adjusted<SuperRARef> {
        let newRef: number;
        let upper: number;
        if (insertRow) {
            const result: { newRef: number; upper: number } = this.insertRowColsRaw(R, N, r, this.rowAbs, this.rowRef);
            newRef = result.newRef;
            upper = result.upper;
            const newRARef: SuperRARef = new SuperRARef(this.colAbs, this.colRef, this.rowAbs, newRef);
            return new Adjusted<SuperRARef>(newRARef, upper, this.rowRef === newRef);
        } else {
            const result: { newRef: number; upper: number } = this.insertRowColsRaw(R, N, r, this.colAbs, this.colRef);
            newRef = result.newRef;
            upper = result.upper;
            const newRARef: SuperRARef = new SuperRARef(this.colAbs, newRef, this.rowAbs, this.rowRef);
            return new Adjusted<SuperRARef>(newRARef, upper, this.colRef === newRef);
        }
    }

    //Signature InsertRowCols(int R, int N, int r, bool rcAbs, int rcRef, out int newRc, out int upper)
    //needs to return out int newRc and out int upper
    insertRowColsRaw(R: number, N: number, r: number, rcAbs: boolean, rcRef: number): { newRef: number; upper: number } {
        let newRef: number;
        let upper: number;

        if (rcAbs) {
            if (rcRef >= R) {
                newRef = rcRef + N;
            } else {
                newRef = rcRef;
            }
            upper = Number.MAX_SAFE_INTEGER;
        } else {
            if (r >= R) {
                if (r + rcRef < R) {
                    newRef = rcRef - N;
                    upper = R - rcRef;
                } else {
                    newRef = rcRef;
                    upper = Number.MAX_SAFE_INTEGER;
                }
            } else {
                if (r + rcRef >= R) {
                    newRef = rcRef + N;
                    upper = R;
                } else {
                    newRef = rcRef;
                    upper = Math.min(R, R - rcRef);
                }
            }
        }
        return { newRef: newRef, upper: upper };
    }

    move(deltaCol: number, deltaRow: number): SuperRARef {
        return new SuperRARef(this.colAbs, this.colAbs ? this.colRef : this.colRef + deltaCol, this.rowAbs, this.rowAbs ? this.rowRef : this.rowRef + deltaRow);
    }

    //Source code is unsure what this does, so naturally I am sceptical
    validAt(col: number, row: number): boolean {
        const ca: RARefCellAddress = new RARefCellAddress(this, col, row);
        return 0 <= ca.col && 0 <= ca.row;
    }

    //Maybe error handling can be better?
    show(col: number, row: number, format: Formats): string {
        switch (format.getRefFmt()) {
            case "A1": {
                const celladdr: RARefCellAddress = new RARefCellAddress(this, col, row);
                return (this.colAbs ? "$" : "") + celladdr.columnName(celladdr.col) + (this.rowAbs ? "$" : "") + (celladdr.row + 1);
            }
            case "R1C1":
                return "R" + this.relAbsFormat(this.rowAbs, this.rowRef, 1) + "C" + this.relAbsFormat(this.colAbs, this.colRef, 1);
            case "C0R0":
                return "C" + this.relAbsFormat(this.colAbs, this.colRef, 0) + "C" + this.relAbsFormat(this.rowAbs, this.rowRef, 0);
            default:
                throw new TypeError("Invalid format " + format.getRefFmt());
        }
    }

    relAbsFormat(abs: boolean, offset: number, origo: number): string {
        if (abs) {
            return (offset + origo).toString();
        } else if (offset === 0) {
            return "";
        } else {
            return "[" + (offset > 0 ? "+" : "") + offset.toString() + "]";
        }
    }

    equals(that: SuperRARef): boolean {
        return that != null && this.colAbs === that.colAbs && this.colRef === that.colRef && this.rowAbs === that.rowAbs && this.rowRef === that.rowRef;
    }

    getHashCode() {
        return ((this.colAbs ? 1 : 0) + (this.rowAbs ? 2 : 0) + this.colRef * 4) * 37 + this.rowRef;
    }
}

//Signature RARef(String a1Ref, int col, int row) in C# source
export class A1RARef extends SuperRARef {
    a1ref: string;
    readonly col: number;
    readonly row: number;

    constructor(a1ref: string, col: number, row: number) {
        super(false, 0, false, 0);
        this.a1ref = a1ref;
        this.col = col;
        this.row = row;

        if (a1ref.toLocaleLowerCase() == "rc".toLocaleLowerCase()) {
            return;
        }

        let i = 0;
        if (i < this.a1ref.length && this.a1ref[i] == "$") {
            this.colAbs = true;
            i++;
        }

        let val = -1;
        //proceed from here
        while (i < a1ref.length && this.isAToZ(this.a1ref[i])) {
            val = (val + 1) * 26 + this.aToZValue(this.a1ref[i]);
            i++;
        }

        this.colRef = this.colAbs ? val : val - this.col;
        if (i < this.a1ref.length && this.a1ref[i] == "$") {
            this.rowAbs = true;
            i++;
        }
        val = this.parseIntWithIndex(this.a1ref, i).value;
        this.rowRef = (this.rowAbs ? val : val - this.row) - 1;
    }
}

//Signature RARef(String r1c1) in C# source
export class R1C1RARef extends SuperRARef {
    r1c1: string;

    constructor(r1c1: string) {
        super(true, 0, true, 0);
        this.r1c1 = r1c1;
        let i = 0;
        if (i < this.r1c1.length && this.r1c1[i] == "R") {
            i++;
        }
        if (i < this.r1c1.length && this.r1c1[i] == "[") {
            this.rowAbs = false;
            i++;
        }
        let result: { value: number; index: number } = this.parseIntWithIndex(this.r1c1, i);
        let val: number = result.value;
        i = result.index;
        if (this.rowAbs && val === 0) {
            this.rowAbs = false;
        }
        this.rowRef = this.rowAbs ? val - 1 : val;
        if (i < this.r1c1.length && this.r1c1[i] == "]") {
            i++;
        }
        if (i < this.r1c1.length && this.r1c1[i] == "C") {
            i++;
        }
        if (i < this.r1c1.length && this.r1c1[i] == "[") {
            this.colAbs = false;
            i++;
        }
        result = this.parseIntWithIndex(this.r1c1, i);
        val = result.value;
        i = result.index;
        if (i < this.r1c1.length && this.r1c1[i] == "]") {
            i++;
        }
        if (this.colAbs && val === 0) {
            this.colAbs = false;
        }
        this.colRef = this.colAbs ? val - 1 : val;
    }
}

//Cell addressing
export class SuperCellAddress {
    readonly col: number;
    readonly row: number;

    constructor(col: number, row: number) {
        this.col = col;
        this.row = row;
    }

    //Signature NormalizeArea(CellAddr ca1, CellAddr ca2, out CellAddr ulCa, out CellAddr lrCa) in CoreCalc
    //Need to verify functionality with future code.
    static normalizeArea(ca1: SuperCellAddress, ca2: SuperCellAddress): { ulCa: SuperCellAddress; lrCa: SuperCellAddress } {
        let minCol: number = ca1.col;
        let minRow: number = ca1.row;
        let maxCol: number = ca2.col;
        let maxRow: number = ca2.row;
        if (ca1.col > ca2.col) {
            minCol = ca2.col;
            maxCol = ca1.col;
        }
        if (ca1.row > ca2.row) {
            minRow = ca2.row;
            maxRow = ca1.row;
        }
        return { ulCa: new SuperCellAddress(minCol, minRow), lrCa: new SuperCellAddress(maxCol, maxRow) };
    }

    offset(offset: SuperCellAddress): SuperCellAddress {
        return new SuperCellAddress(this.col + offset.col, this.row + offset.row);
    }

    //This is a combination of the two equals methods in CoreCalc.
    //The operator overload in CoreCalc is faulty, it compares the wrong variables.
    equals(that: unknown): boolean {
        if (that instanceof SuperCellAddress) {
            return this.col === that.col && this.row === that.row;
        }
        return false;
    }

    getHashCode(): number {
        return 29 * this.col + this.row;
    }

    toString(): string {
        return this.columnName(this.col) + (this.row + 1);
    }

    //translates a column number to an excel-style letter.
    columnName(col: number): string {
        let name = "";
        while (col >= 26) {
            name = String.fromCharCode("A".charCodeAt(0) + (col % 26)) + name;
            col = Math.floor(col / 26) - 1;
        }
        return String.fromCharCode("A".charCodeAt(0) + col) + name;
    }
}

export class RARefCellAddress extends SuperCellAddress {
    constructor(cr: SuperRARef, col: number, row: number) {
        const caCol: number = cr.colAbs ? cr.colRef : cr.colRef + col;
        const caRow: number = cr.rowAbs ? cr.rowRef : cr.rowRef + row;
        super(caCol, caRow);
    }
}

//Signature CellAddr(String a1Ref) in C# source
export class A1RefCellAddress extends RARefCellAddress {
    constructor(a1ref: string) {
        super(new A1RARef(a1ref, 0, 0), 0, 0);
    }
}

//This is used with a screen pointer. We have to figure out how this interacts with the rest of code.
export class PointCellAddress extends SuperCellAddress {
    constructor(point: { x: number; y: number }) {
        const caCol: number = point.x;
        const caRow: number = point.y;
        super(caCol, caRow);
    }
}

export class FullCellAddress {
    readonly sheet: Sheet;
    readonly cellAddress: SuperCellAddress;

    //Trying to work with optional params instead of inheritance
    constructor(sheet: Sheet, cellAddress?: SuperCellAddress | null, col?: number, row?: number, a1string?: string) {
        this.sheet = sheet;
        if (cellAddress) {
            this.cellAddress = cellAddress;
        } else if ((col && row) || Number(col) === 0 || Number(row) === 0) {
            this.cellAddress = new SuperCellAddress(Number(col), Number(row));
        } else if (a1string) {
            this.cellAddress = new A1RefCellAddress(a1string);
        } else {
            throw new Error("Unsupported cell address");
        }
    }

    //Different signature because of TypeScript
    equals(that: FullCellAddress | unknown): boolean {
        if (that instanceof FullCellAddress) {
            return this.cellAddress.equals(that.cellAddress) && this.sheet === that.sheet;
        }
        return false;
    }

    getHashCode(): number {
        return this.cellAddress.getHashCode() * 29 + this.sheet.getHashCode();
    }

    //lots of operator overloading here that we can't do in TypeScript. To be considered?

    //Should this use the cellAddress toString method?
    toString(): string {
        return this.sheet.getName() + "!" + this.cellAddress;
    }

    public Eval(): Value | null {
        const cell = this.sheet.Get(this.cellAddress);
        if (cell != null) {
            return cell.Eval(this.sheet, this.cellAddress.col, this.cellAddress.row);
        }
        return null;
    }


    public tryGetCell(): Cell | null{
        return this.sheet.Get(this.cellAddress);
    }
}

export class SupportSet {
    readonly ranges: SupportRange[] = [];

    //Creates either a support cell or support area and adds it to the support set of the cell given by
    //col, row. This exists to exclude the original cell even if it is inside a cell area.
    addSupport(sheet: Sheet, col: number, row: number, suppSheet: Sheet, suppCols: Interval, suppRows: Interval): void {
        const range: SupportRange = SupportRange.make(suppSheet, suppCols, suppRows);

        if (!range.removeCell(this, sheet, col, row)) {
            this.add(range);
        }
    }

    //removes cells from the given ranges. This may cascade depending on whether the range
    //is a lone cell or an area.
    removeCell(sheet: Sheet, col: number, row: number): void {
        let i = 0;
        let count: number = this.ranges.length;
        while (i < count) {
            if (this.ranges[i].removeCell(this, sheet, col, row)) {
                this.ranges.splice(i, 1);
                count--;
            } else {
                i++;
            }
        }
    }

    //Add a range to the cell's support set.
    add(range: SupportRange) {
        this.ranges.push(range);
    }

    //NOT SURE THIS WORKS, THE FOR-EACH LOOP IS NOT TRADITIONALLY DONE LIKE THIS
    forEachSupported(act: (sheet: Sheet, col: number, row: number) => void): void {
        for (const range of this.ranges) {
            range.forEachSupported(act);
        }
    }
}

export abstract class SupportRange {
    static make(sheet: Sheet, colInterval: Interval, rowInterval: Interval): SupportRange {
        if (colInterval.min === colInterval.max && rowInterval.min === rowInterval.max) {
            return new SupportCell(sheet, colInterval.min, rowInterval.min);
        }
        return new SupportArea(sheet, colInterval, rowInterval);
    }

    abstract removeCell(set: SupportSet, sheet: Sheet, col: number, row: number): boolean;

    //have to use an arrow function here to preserve the function signature for an abstract function
    abstract forEachSupported(act: (sheet: Sheet, col: number, row: number) => void): void;

    abstract contains(sheet: Sheet, col: number, row: number): boolean;

    abstract get count(): number;
}

//I don't understand why we have to call super when the superclass has no constructor. Have to investigate.
export class SupportCell extends SupportRange {
    readonly sheet: Sheet;
    readonly col: number;
    readonly row: number;

    constructor(sheet: Sheet, col: number, row: number) {
        super();
        this.sheet = sheet;
        this.col = col;
        this.row = row;
    }

    //Is this even implemented???
    removeCell(set: SupportSet, sheet: Sheet, col: number, row: number): boolean {
        return this.contains(sheet, col, row);
    }

    contains(sheet: Sheet, col: number, row: number): boolean {
        return this.sheet === sheet && this.row === row && this.col === col;
    }

    forEachSupported(act: (sheet: Sheet, col: number, row: number) => void): void {
        act(this.sheet, this.col, this.row);
    }

    get count(): number {
        return 1;
    }

    //interesting implementation requires testing
    toString(): string {
        return new FullCellAddress(this.sheet, null, this.col, this.row).toString();
    }
}

//An absolute cell area (columnInterval, rowInterval) in the support set of a given cell.
export class SupportArea extends SupportRange {
    private static readonly alreadyVisited: SupportArea[] = [];
    static idempotentForeach: boolean;
    readonly sheet: Sheet;
    readonly colInterval: Interval;
    readonly rowInterval: Interval;

    constructor(sheet: Sheet, colInterval: Interval, rowInterval: Interval) {
        super();
        this.sheet = sheet;
        this.colInterval = colInterval;
        this.rowInterval = rowInterval;
    }

    //Removes a cell (sheet, col, row) from the given support set (set) by removing it from the
    //support area, and splitting the remaining area in to new areas. For example, the area defined
    //by intervals colInt: 1-3 and rowInt: 1-3 is a single area, but if we remove cell: 2,2 from the
    //area, the remaining area has to be split into 4 new areas (N, S, E, W).
    override removeCell(set: SupportSet, sheet: Sheet, col: number, row: number): boolean {
        if (this.contains(sheet, col, row)) {
            if (this.rowInterval.min < row) {
                set.add(SupportArea.make(sheet, new Interval(col, col), new Interval(this.rowInterval.min, row - 1)));
            }
            if (row < this.rowInterval.max) {
                set.add(SupportArea.make(sheet, new Interval(col, col), new Interval(row + 1, this.rowInterval.max)));
            }
            if (this.colInterval.min < col) {
                set.add(SupportArea.make(sheet, new Interval(this.colInterval.min, col - 1), this.rowInterval));
            }
            if (col < this.colInterval.max) {
                set.add(SupportArea.make(sheet, new Interval(col + 1, this.colInterval.max), this.rowInterval));
            }
            return true;
        }
        return false;
    }

    static get idempotentForeachFunction(): boolean {
        return this.idempotentForeach;
    }

    static set idempotentForeachFunction(value: boolean) {
        this.idempotentForeach = value;
        this.alreadyVisited.length = 0;
    }

    //These next larger methods are all part of a group that handles the processing of supporting cells in an area, making sure to avoid processing the same cell more than once, even when area overlap.
    forEachSupported(act: (sheet: Sheet, col: number, row: number) => void): void {
        if (SupportArea.idempotentForeach && this.count > SupportArea.alreadyVisited.length + 1) {
            for (let i = 0; i < SupportArea.alreadyVisited.length; i++) {
                const old: SupportArea = SupportArea.alreadyVisited[i];
                if (this.overlaps(old)) {
                    const overlap: SupportArea = this.overlap(old);
                    if (overlap.count === this.count) {
                        return;
                    } else if (overlap.count === old.count) {
                        SupportArea.alreadyVisited[i] = this;
                        this.forEachExcept(overlap, act);
                        return;
                    } else if (this.colInterval.equals(old.colInterval) && this.rowInterval.overlaps(old.rowInterval)) {
                        SupportArea.alreadyVisited[i] = new SupportArea(this.sheet, this.colInterval, this.rowInterval.union(old.rowInterval));
                        this.forEachExcept(overlap, act);
                        return;
                    } else if (this.rowInterval.equals(old.rowInterval) && this.colInterval.overlaps(old.colInterval)) {
                        SupportArea.alreadyVisited[i] = new SupportArea(this.sheet, this.colInterval.union(old.colInterval), this.rowInterval);
                        this.forEachExcept(overlap, act);
                        return;
                    } else {
                        SupportArea.alreadyVisited.push(this);
                        this.forEachExcept(overlap, act);
                        return;
                    }
                }
            }
            SupportArea.alreadyVisited.push(this);
        }
        SupportArea.forEachInArea(this.sheet, this.colInterval, this.rowInterval, act);
    }

    //Iterates over all regions of a SupportArea, except for overlapping region with another SupportArea.
    private forEachExcept(overlap: SupportArea, act: (sheet: Sheet, row: number, col: number) => void): void {
        if (this.rowInterval.min < overlap.rowInterval.min)
            // North non-empty, columns above overlap
            SupportArea.forEachInArea(this.sheet, overlap.colInterval, new Interval(this.rowInterval.min, overlap.rowInterval.min - 1), act);
        if (overlap.rowInterval.max < this.rowInterval.max)
            // South non-empty, columns below overlap
            SupportArea.forEachInArea(this.sheet, overlap.colInterval, new Interval(overlap.rowInterval.max + 1, this.rowInterval.max), act);
        if (this.colInterval.min < overlap.colInterval.min)
            // West non-empty, rows left of overlap
            SupportArea.forEachInArea(this.sheet, new Interval(this.colInterval.min, overlap.colInterval.min - 1), this.rowInterval, act);
        if (overlap.colInterval.max < this.colInterval.max)
            // East non-empty, rows right of overlap
            SupportArea.forEachInArea(this.sheet, new Interval(overlap.colInterval.max + 1, this.colInterval.max), this.rowInterval, act);
    }

    //does something
    private static forEachInArea(sheet: Sheet, colInt: Interval, rowInt: Interval, act: (sheet: Sheet, col: number, row: number) => void): void {
        for (let c: number = colInt.min; c <= colInt.max; c++) {
            for (let r: number = rowInt.min; r <= rowInt.max; r++) {
                act(sheet, c, r);
            }
        }
    }

    override contains(sheet: Sheet, col: number, row: number): boolean {
        return this.sheet === sheet && this.colInterval.contains(col) && this.rowInterval.contains(row);
    }

    //Get size of rectangular cell block
    override get count(): number {
        return this.colInterval.length() * this.rowInterval.length();
    }

    //Check whether two support areas overlap
    overlaps(that: SupportArea): boolean {
        return this.sheet === that.sheet && this.colInterval.overlaps(that.colInterval) && this.rowInterval.overlaps(that.rowInterval);
    }

    //Return the overlap between two overlapping support areas.
    overlap(that: SupportArea): SupportArea {
        if (!this.overlaps(that)) {
            throw new Error("The areas do not overlap."); // Assert equivalent
        }
        return new SupportArea(this.sheet, this.colInterval.intersect(that.colInterval), this.rowInterval.intersect(that.rowInterval));
    }

    override toString(): string {
        const ulCa: SuperCellAddress = new SuperCellAddress(this.colInterval.min, this.rowInterval.min);
        const lrCa: SuperCellAddress = new SuperCellAddress(this.colInterval.max, this.rowInterval.max);
        return `${this.sheet.getName()}!${ulCa}:${lrCa}`;
    }
}
