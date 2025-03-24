import { Sheet } from "./Sheet";
import { Value } from "./Value";
import { Adjusted, FullCellAddress, Interval, RARefCellAddress, SuperCellAddress, SuperRARef } from "./CellAddressing";
import { Cell } from "./Cells";
import { Formats, IEquatable } from "./Types";
import { NumberValue } from "./NumberValue";
import { TextValue } from "./TextValue";
import { ErrorValue } from "./ErrorValue";
import { ArrayView } from "./ArrayValue";

// An Expr is an expression that may appear in a Formula cell.
export abstract class Expr {
    // Update cell references when containing cell is moved (not copied)
    public abstract Move(deltaCol: number, deltaRow: number): Expr;

    // Invalidate off-sheet references when containing cell is copied (not moved)
    public abstract CopyTo(col: number, row: number): Expr;

    // Evaluate expression as if at cell address sheet[col, row]
    public abstract Eval(sheet: Sheet, col: number, row: number): Value;

    // Using "protected" instead of "internal"
    protected abstract VisitorCall(visitor: IExpressionVisitor): void;

    // Insert N new rowcols before rowcol R>=0, when we're at rowcol r
    public abstract InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr>;

    // Apply refAct once to each CellRef in expression, and areaAct once to each CellArea
    protected abstract VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void;

    // Increase the support sets of all cells referred from this expression, when
    // the expression appears in the block supported[col..col+cols-1, row..row+rows-1]
    protected AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number): void {
        this.VisitRefs(
            new RefSet(),
            (cellRef: CellRef) => cellRef.AddToSupport(supported, col, row, cols, rows),
            (cellArea: CellArea) => cellArea.AddToSupport(supported, col, row, cols, rows),
        );
    }

    // Apply act, once only, to the full cell address of each cell referred from expression
    public ForEachReferred(sheet: Sheet, col: number, row: number, act: (fullCellAddr: FullCellAddress) => void): void {
        this.VisitRefs(
            new RefSet(),
            (cellRef: CellRef) => act(cellRef.GetAbsoluteAddr(sheet, col, row)),
            (areaRef: CellArea) => areaRef.ApplyToFcas(sheet, col, row, act),
        );
    }

    // Remove sheet[col, row] from the support sets of cells referred from this expression
    public RemoveFromSupportSets(sheet: Sheet, col: number, row: number): void {
        this.ForEachReferred(
            sheet,
            col,
            row, // Remove sheet[col,row] from support set at fca
            (fca: FullCellAddress) => {
                const cell: Cell = fca.TryGetCell(); // Will be non-null if support correctly added
                cell.RemoveSupportFor(sheet, col, row);
            },
        );
    }

    // Call dependsOn(fca) on all cells fca referred from expression, with multiplicity.
    // Cannot be implemented in terms of VisitRefs, which visits only once.
    public abstract DependsOn(here: FullCellAddress, dependsOn: (fca: FullCellAddress) => void): void;

    // True if expression textually contains a call to a volatile function
    public abstract get isVolatile(): boolean;

    // Show contents as expression
    public abstract Show(col: number, row: number, ctxpre: number, fo: Formats): string;
}

// A Const expression is a constant, immutable and sharable.
abstract class Const extends Expr {
    public static Make(value: Value): Const {
        if (value instanceof NumberValue) {
            return new NumberConst((value as NumberValue).value);
        } else if (value instanceof TextValue) {
            return new TextConst((value as TextValue).value as string);
        } else return new ValueConst(value);
    }

    public override Move(deltaCol: number, deltaRow: number): Expr {
        return this;
    }

    // Any expression can be copied with sharing
    public override CopyTo(col: number, row: number): Expr {
        return this;
    }

    public override InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr> {
        return new Adjusted<Expr>(this);
    }

    protected override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void {}

    public override DependsOn(here: FullCellAddress, dependsOn: (fullCellAddress: FullCellAddress) => void): void {}

    public override get isVolatile(): boolean {
        return false;
    }
}

// A NumberConst is a constant number-valued expression.
class NumberConst extends Const {
    public readonly value: NumberValue;

    public constructor(d: number) {
        super();
        console.assert(!isNaN(d) && d !== Infinity);
        this.value = NumberValue.Make(d) as NumberValue;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitNumberConst(this);
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return this.value.ToString();
    }
}

class TextConst extends Const {
    public readonly value: TextValue;

    constructor(s: string) {
        super();
        this.value = TextValue.MakeInterned(s);
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitTextConst(this);
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return '"' + this.value + '"';
    }
}

class ValueConst extends Const {
    public readonly value: Value;
    constructor(value: Value) {
        super();
        this.value = value;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitValueConst(this);
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return `ValueConst[${this.value}]`;
    }
}

class Error extends Const {
    public readonly value: ErrorValue;
    private readonly error: string;
    public static readonly refError: Error = new Error(ErrorValue.refError);

    constructor(msg: string | ErrorValue) {
        super();
        if (msg instanceof String) {
            this.value = ErrorValue.Make(msg as string);
        } else {
            this.value = msg as ErrorValue;
        }
        this.error = this.value.ToString();
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitError(this);
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return this.error;
    }
}

// Should
interface IExpressionVisitor {
    visitNumberConst(numbConst: NumberConst): void;
    visitTextConst(textConst: TextConst): void;
    visitValueConst(valueConst: ValueConst): void;
    visitError(expr: Error): void;
    // visitFunCall(funCall: FunCall): void; Not going to be implemented
    visitCellRef(cellRef: CellRef): void;
    visitCellArea(cellArea: CellArea): void;
}

class RefSet {
    private readonly cellRefsSeen = new Set<CellRef>();
    private readonly cellAreasSeen = new Set<CellArea>();

    public Clear() {
        this.cellRefsSeen.clear();
        this.cellAreasSeen.clear();
    }

    public SeenBefore(arg1: CellRef | CellArea): boolean {
        if (arg1 instanceof CellRef) {
            return !this.cellRefsSeen.add(arg1 as CellRef);
        } else {
            return !this.cellAreasSeen.has(arg1 as CellArea);
        }
    }
}

// Should it inherit from IEquatable<CellArea>?
class CellRef extends Expr implements IEquatable<CellRef> {
    public readonly raref: SuperRARef;
    public readonly sheet: Sheet;

    constructor(sheet: Sheet, raref: SuperRARef) {
        super();
        this.sheet = sheet;
        this.raref = raref;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        const ca: RARefCellAddress = this.raref.address(col, row);
        const cell: Cell | null = (this.sheet ?? sheet).Get(ca.col, ca.row);
        return cell?.Eval(sheet, ca.col, ca.row) as Value;
    }

    public GetAbsoluteAddr(sheet: Sheet | FullCellAddress, col?: number, row?: number): FullCellAddress {
        if (sheet instanceof FullCellAddress) {
            return this.GetAbsoluteAddr(sheet.sheet, sheet.cellAddress.col, sheet.cellAddress.row);
        } else {
            return new FullCellAddress(this.sheet ?? sheet, this.raref.address(col as number, row as number));
        }
    }

    public override Move(deltaCol: number, deltaRow: number): Expr {
        return new CellRef(this.sheet, this.raref.move(deltaCol, deltaRow));
    }

    public override CopyTo(col: number, row: number): Expr {
        if (this.raref.validAt(col, row)) {
            return this;
        }
        return Error.refError;
    }

    public override InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr> {
        if (this.sheet == modSheet || (this.sheet == null && thisSheet)) {
            const adj: Adjusted<SuperRARef> = this.raref.insertRowCols(R, N, r, doRows);
            return new Adjusted<Expr>(new CellRef(this.sheet, adj.type), adj.maxValidRow, adj.isUnchanged);
        } else {
            return new Adjusted<Expr>(this);
        }
    }
    // must be public!
    public AddToSupport(supported: Sheet, col: number, row: number, cols: number, rows: number) {
        const referredSheet = this.sheet ?? supported;
        const ca = this.raref.colRef,
            ra = this.raref.rowRef;
        const r1 = row,
            r2 = row - 1,
            c1 = col,
            c2 = col + cols - 1;
        let referredCols: Interval, referredRows: Interval;
        let supportedCols: (arg: number) => Interval;
        let supportedRows: (arg: number) => Interval;
        [referredCols, supportedCols] = CellRef.RefAndSupp(this.raref.colAbs, ca, c1, c2);
        [referredRows, supportedRows] = CellRef.RefAndSupp(this.raref.rowAbs, ra, r1, r2);

        if (referredCols.length() < referredRows.length()) {
            referredCols.forEach((c) => {
                const suppCols: Interval = supportedCols(c);
                referredRows.forEach((r) => {
                    referredSheet.AddSupport(c, r, supported, suppCols, supportedRows(r));
                });
            });
        } else {
            referredRows.forEach((r) => {
                const suppRows: Interval = supportedRows(r);
                supportedRows(r).forEach((c) => {
                    referredSheet.AddSupport(c, r, supported, supportedCols(c), suppRows);
                });
            });
        }
    }

    protected override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void) {
        if (!refSet.SeenBefore(this)) {
            refAct(this);
        }
    }

    public override DependsOn(here: FullCellAddress, dependsOn: (fca: FullCellAddress) => void) {
        dependsOn(this.GetAbsoluteAddr(here));
    }

    public override get isVolatile(): boolean {
        return false;
    }

    public equals(that: CellRef): boolean {
        return this.raref.equals(that.raref);
    }

    public GetHashCode() {
        return this.raref.getHashCode();
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        const s = this.raref.show(col, row, fo);
        return this.sheet == null ? s : this.sheet.getName() + "!" + s;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitCellRef(this);
    }

    private static RefAndSupp(abs: boolean, ra: number, r1: number, r2: number): [Interval, (arg: number) => Interval] {
        let referred: Interval;
        let supported: (arg: number) => Interval;

        if (abs) {
            referred = new Interval(ra, ra);
            supported = (_r) => new Interval(r1, r2); // Accepts `_r` even if unused
        } else {
            referred = new Interval(r1 + ra, r2 + ra);
            supported = (r) => new Interval(r - ra, r - ra);
        }

        return [referred, supported]; // Correct tuple return
    }
}

// Should it inherit from IEquatable<CellArea>?
class CellArea extends Expr implements IEquatable<CellArea> {
    private readonly ul: SuperRARef;
    private readonly lr: SuperRARef;
    public readonly sheet: Sheet;
    constructor(
        sheet: Sheet,
        ul: SuperRARef | boolean,
        lr: SuperRARef | number,
        ulRowAbs?: boolean,
        ulRowRef?: number,
        lrColAbs?: boolean,
        lrColRef?: number,
        lrRowAbs?: boolean,
        lrRowRef?: number,
    ) {
        super();
        this.sheet = sheet;

        if (ul instanceof SuperRARef) {
            this.ul = ul;
            this.lr = lr as SuperRARef;
        } else {

            this.ul = new SuperRARef(ul as boolean, lr as number, ulRowAbs as boolean, ulRowRef as number);
            this.lr = new SuperRARef(lrColAbs as boolean, lrColRef as number, lrRowAbs as boolean, lrRowRef as number);
        }
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.MakeArrayView(sheet, col, row);
    }

    public MakeArrayView(fca: FullCellAddress | Sheet, col?: number, row?: number): ArrayView {
        if (fca instanceof FullCellAddress) {
            return this.MakeArrayView(fca.sheet, fca.cellAddress.col, fca.cellAddress.row);
        } else {
            const ulCa = this.ul.address(col as number,row as number);
            const lrCa = this.lr.address(col as number,row as number);
            // In the original version, there is a unused nested for-loop?
            return ArrayView.Make(ulCa, lrCa, this.sheet ?? (fca as Sheet));
        }
    }


    ApplyToFcas(sheet: Sheet, col: number, row: number, act: (fullCellAddr: FullCellAddress) => void) {
        const ulCa = this.ul.address(col as number, row as number);
        const lrCa = this.lr.address(col as number, row as number);

        ArrayView.Make(ulCa, lrCa, this.sheet ?? sheet).Apply((val: Value) => {
            const fullCellAddr: FullCellAddress = val as unknown as FullCellAddress;
            act(fullCellAddr);
        });
    }


    public override Move(deltaCol: number, deltaRow: number): Expr {
        return new CellArea(this.sheet, this.ul.move(deltaCol,deltaRow), this.lr.move(deltaCol,deltaRow))
    }

    public override CopyTo(col: number, row: number): Expr {
        if(this.ul.validAt(col,row) && this.lr.validAt(col,row)) {
            return this
        } else {
            return Error.refError
        }
    }

    public override InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr> {
        if (this.sheet == modSheet || this.sheet == null && thisSheet) {
            const ulNew:Adjusted<SuperRARef> = this.ul.insertRowCols(R,N,r,doRows)
            const lrNew:Adjusted<SuperRARef> = this.lr.insertRowCols(R,N,r,doRows)
            const upper = Math.min(ulNew.maxValidRow,lrNew.maxValidRow)

            return new Adjusted<Expr>(new CellArea(this.sheet,ulNew.type, lrNew.type), upper, ulNew.isUnchanged && lrNew.isUnchanged)
        } else {
            return new Adjusted<Expr>(this)
        }
    }

    public AddToSupport(supported:Sheet, col: number, row: number, cols: number, rows: number) {
        const referredSheet = this.sheet ?? supported
        let referredRows:Interval, referredCols:Interval;
        let supportedCols: (arg: number) => Interval;
        let supportedRows: (arg: number) => Interval;
        const ra = this.ul.rowRef, rb = this.lr.rowRef, r1 = row, r2 = row + rows -1
        const ca =this.ul.colRef, cb = this.lr.colRef, c1 = col, c2 = col + cols - 1;

        [referredRows, supportedRows] = CellArea.RefAndSupp(this.ul.rowAbs, this.lr.rowAbs, ra, rb, r1, r2);
       [referredCols, supportedCols] =  CellArea.RefAndSupp(this.ul.colAbs, this.lr.colAbs, ca, cb, c1, c2,);

       if(referredCols.length() < referredRows.length()) {
           referredCols.forEach((col) => {
               const suppCols = supportedCols(col)
               referredRows.forEach((row) => {
                   referredSheet.AddSupport(col, row, supported, suppCols, supportedRows(row))
               })
           })
       } else {
           referredRows.forEach((row) => {
               const suppRows = supportedRows(col)
               referredCols.forEach((col) => {
                   referredSheet.AddSupport(col, row, supported, supportedCols(col), suppRows)
               })
           })
       }
    }

    private static RefAndSupp(ulAbs:boolean, lrAbs:boolean, ra:number, rb:number, r1:number, r2:number):  [Interval, (arg: number) => Interval] {
        if (ulAbs) {
            if (lrAbs) {
                [ra, rb] = [Math.min(ra, rb), Math.max(ra, rb)];
                return [new Interval(ra, rb), (r) => new Interval(ra, rb)];
            } else {
                return [new Interval(Math.min(ra, r1 + rb), Math.max(ra, r2 + rb )),
                    (r) => ra < r ? new Interval(Math.max(r1, r - rb),r2):
                        ra > r ? new Interval(r1, Math.min(r2, r -rb)) :
                            new Interval(r1 ,r2)
                ]
            }

        } else {
            if (lrAbs) {
                return [new Interval(Math.min(ra, r1 + rb),
                    Math.max(ra, r2 + rb)), (r) => ra < r ?
                    new Interval(Math.max(r1, r - rb), r2) : rb < r ?
                        new Interval(Math.max(r1, r - ra), r2) : new Interval(r1, r2)]
            } else {
                [ra, rb] = [Math.min(ra, rb), Math.max(ra, rb)];
                return [new Interval(r1 +ra, r2 + rb), (r) => new Interval(Math.max(r1, r - rb), Math.min(r2, r - ra))]
            }

        }
    }


    protected override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void) {
        if(!refSet.SeenBefore(this)) {
            areaAct(this)
        }
    }

    public override DependsOn(here: FullCellAddress, dependsOn: (fca: FullCellAddress) => void) {
        this.ApplyToFcas(here.sheet, here.cellAddress.col, here.cellAddress.row, dependsOn)
    }

    public override get isVolatile(): boolean {
        return false;
    }

    public equals(that: CellArea): boolean {
        return that != null && this.ul.equals(that.ul) && this.lr.equals(that.lr);
    }


    public GetHashCode() {
        return this.lr.getHashCode() * 511 + this.ul.getHashCode()
    }


    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        const s = this.ul.show(col, row, fo) + ":" + this.lr.show(col, row, fo);
        return this.sheet == null ? s : this.sheet.getName() + "!" + s;
    }

    protected override VisitorCall(visitor: IExpressionVisitor) {
        visitor.visitCellArea(this);
    }
}
