import  { Sheet } from "./Sheet";
import {ArrayExplicit, ArrayView, ErrorValue, NumberValue, TextValue, Value} from "./Values.ts";
import { Adjusted, FullCellAddress, Interval, SuperCellAddress, SuperRARef } from "./CellAddressing";
import {Cell} from "./Cells";
import { type Formats, ImpossibleException } from "./Types";
import * as formulajs from '@formulajs/formulajs'
// Importing formulajs


// An Expr is an expression that may appear in a Formula cell.
export abstract class Expr {
    // Update cell references when containing cell is moved (not copied)
    public abstract Move(deltaCol: number, deltaRow: number): Expr;

    // Invalidate off-sheet references when containing cell is copied (not moved)
    public abstract CopyTo(col: number, row: number): Expr;

    // Evaluate expression as if at cell address sheet[col, row]
    public abstract Eval(sheet: Sheet, col: number, row: number): Value;

    // Insert N new rowcols before rowcol R>=0, when we're at rowcol r
    public abstract InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr>;

    // Apply refAct once to each CellRef in expression, and areaAct once to each CellArea
    public abstract VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void;

    // Increase the support sets of all cells referred from this expression, when
    // the expression appears in the block supported[col..col+cols-1, row..row+rows-1]
    public AddToSupportSets(supported: Sheet, col: number, row: number, cols: number, rows: number): void {
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
                const cell: Cell = fca.tryGetCell()!; // Will be non-null if support correctly added
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

    public override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void {}

    public override DependsOn(here: FullCellAddress, dependsOn: (fullCellAddress: FullCellAddress) => void): void {}

    public override get isVolatile(): boolean {
        return false;
    }
}

// A NumberConst is a constant number-valued expression.
export class NumberConst extends Const {
    public readonly value: NumberValue;

    public constructor(d: number) {
        super();
        console.assert(!isNaN(d) && d !== Number.POSITIVE_INFINITY);
        this.value = NumberValue.Make(d) as NumberValue;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return this.value.ToString();
    }
}

export class TextConst extends Const {
    public readonly value: TextValue;

    constructor(s: string) {
        super();
        this.value = TextValue.MakeInterned(s);
    }

    /**
     * Returns the value of the TextConst
     *
     * @param sheet - the sheet
     * @param col - Column index
     * @param row - Row index
     * @returns Value - The value to be returned
     */
    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return '"' + this.value + '"';
    }
}

/**
 * A ValueConst is an arbitrary constant valued expression, used only
 * for partial evaluation; there is no corresponding formula source syntax.
 */
class ValueConst extends Const {
    public readonly value: Value;
    constructor(value: Value) {
        super();
        this.value = value;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return `ValueConst[${this.value}]`;
    }
}

export class Error extends Const {
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
        this.error = this.value.toString();
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {
        return this.value;
    }

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return this.error;
    }
}

/**
 * The ExprArray class is a helper class that we made for storing expressions in arrays.
 * This is necessary because formula.js has functions that uses arrays as arguments fx:
 * - AGGREGATE(9, 4, [-5,15], [32,'Hello World!'])
 *
 * In this way, FunCall expressions can end up holding nested arrays because functions
 * like AGGREGATE takes arrays as arguments. And ExprArray is then the type we use for
 * these nested arrays.
 */
//TODO: Should extend expr instead of Const because it should also be able to take cellrefs
export class ExprArray extends Expr {
    public readonly es: Expr[];

    private constructor(es: Expr[]) {
        super();
        this.es = es;
    }

    public static MakeExprArray(es: Expr[]): Expr {
        return new ExprArray(es);
    }

    public GetExprArray(): Expr[] {
        return this.es;
    }

    Eval(sheet: Sheet, col: number, row: number): Value {
        console.log("this is where things go wrong")
        throw new Error("Not implemented"); // this is most likely a problem
    }

    Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        return this.es.toString()
    }


    CopyTo(col: number, row: number): Expr {
        throw new Error("CopyTo Not implemented");
    }

    DependsOn(here: FullCellAddress, dependsOn: (fca: FullCellAddress) => void): void {
    }

    InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr> {
        throw new Error("InsertRowCols Not implemented");
    }

    Move(deltaCol: number, deltaRow: number): Expr {
        throw new Error("Move Not implemented");
    }

    VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void {
    }

    get isVolatile(): boolean {
        // Check if any of the expressions in the array are volatile
        return this.es.some(expr => expr.isVolatile);    }
}

// Why does it work without Date?? Because Date results are converted to string in FunCall.Eval().
/**
 *
 */
type functionType = (...args: (string | number | ErrorValue | number[] | string[])[])
    => string | number | boolean | ErrorValue | Date | number[];

/**
 * A FunCall expression is an operator application such as 1+$A$4 or a function
 * call such as RAND() or SIN(4*A$7) or SUM(B4:B52; 3) or IF(A1; A2; 1/A1).
 */
export class FunCall extends Expr {
    // "function" represents a function that takes an unknown amount
    // of arguments (of type unknown) and returns a value of type unknown.
    // It's a replacement of the previous "Function" type and the purpose
    // of it is to match formulajs which is not a class but an object
    // containing various spreadsheet functions:
    public readonly function: functionType;
    public es: Expr[];           // Non-null, elements non-null
    public nonStrict: boolean;        // We implemented a flag for non-strict functions such that we know if some of their arguments should not be evaluated.
    public isChoose: boolean

    private constructor (name: string | functionType, es: Expr[]) {
        super();
        if (typeof name === "function") {
            this.function = name;
        } else {
            this.function = FunCall.getFunctionByName(name);
        }
        this.es = es;
        this.nonStrict = false;
        this.isChoose = false;
    }

    public static getFunctionByName(name: string): functionType {
        if (name in formulajs) {
            // "typeof formulajs" is "object" and it contains all the spreadsheet functions.
            // "keyof" that object are function names like "SUM" and "PRODUCT".
            // "name as" compares the string to the function names. At last, we cast it as the
            // functionType:
            return formulajs[name as keyof typeof formulajs] as functionType;
        }
        throw new Error(`Function ${name} not found in formulajs`);
    }

    private static IF(es: Expr[]) {
        const func: functionType = (...args)=> {
            if (args[0]) {
                return args[1] as string | number | boolean | ErrorValue | Date | number[];
            } else {
                return args[2] as string | number | boolean | ErrorValue | Date | number[];
            }
        }

        // We create a new instance of FunCall, such that we can update our non-strict flag to true.
        // This is important for methods such as IF and CHOOSE, where lazy evaluation is desired.
        const funCall = new FunCall(func, es);
        funCall.nonStrict = true;
        return funCall;
    }



    private static CHOOSE(es: Expr[]) {
        const func: functionType = (...args)=> {
            if((args[0] as Value).ToObject() as number >= 1 && (args[0] as Value).ToObject() as number <= args.length) {
                return args[0] as string | number | boolean | ErrorValue | Date | number[];
            } else {
                return ErrorValue.valueError // In case the user provided an index that is out of bounds
            }
        }


        const funCall = new FunCall(func, es);
        funCall.nonStrict = true;
        funCall.isChoose = true;
        return funCall;
    }



    public static Make(name: string, es: Expr[]): Expr {

        if (name === "NEG") {return this.NEG(es)}
        if (name === "EQUALS") {return this.EQUALS(es);}
        if (name === "DIVIDE") {return this.DIVIDE(es);}
        if (name === "SUB") {return this.SUB(es)}
        if (name === "ADD") {return this.ADD(es)}
        if (name === "IF") {return this.IF(es)}
        if (name === "CHOOSE") {return this.CHOOSE(es)}
        if (name === "NOTEQUALS") {return this.NOTEQUALS(es)}
        if (name === "GEQ") {return this.GEQ(es)}
        if (name === "GEQUALS") {return this.GEQUALS(es)}
        if (name === "LEQUALS") {return this.LEQUALS(es)}
        if (name === "LEQ") {return this.LEQ(es)}
        if (name === "CONCATENATE") {return this.CONCATENATE(es)}
        if (name === "ARRAY") {return ExprArray.MakeExprArray(es);}

        const func: functionType | null = FunCall.getFunctionByName(name);
        if (func === null) {
            throw new Error(`Function ${name} not found in formulajs`); // MakeUnknown was called here previously.
        }

        for (let i = 0; i < es.length; i++) {
            if (es[i] === null || es[i] === undefined) {
                es[i] = new Error("#SYNTAX") as unknown as Expr;
            }
        }
        return new FunCall(func, es);
    }

    /**
     * EQUALS is a function that we implemented ourselves to check if two values are equal.
     * The method creates a "lambda" function and stores it in "func". So we don't evaluate
     * "func" now but instead pass it on to a new FunCall instantiation.
     */
    private static EQUALS(es: Expr[]) {
        const func: functionType = (...args)=> {
                return args[0] === args[1];
            }

        return new FunCall(func, es)
    }

    private static CONCATENATE(es: Expr[]) {
        const func: functionType = (...args)=> {

            return args.join('');  // Join all arguments as strings
        }
        return new FunCall(func, es);
    }

    /**
     * NEG is a function that we implemented ourselves to turn a positive number into a negative number
     * or vice versa.
     */
    private static NEG(es: Expr[]) {
        const func: functionType = (...args)=> {
            const arg = args[0] as number;
            return -arg;
        }
        return new FunCall(func, es)
    }

    /**
     * NOT EQUALS is a function that we implemented ourselves to check if two variables are not the same
     */

    private static NOTEQUALS(es: Expr[]) {
        const func: functionType = (...args)=> {
                return args[0] !== args[1];
        }
        return new FunCall(func, es)
    }

    private static GEQ(es: Expr[]) {
        const func: functionType = (...args)=> {

                return (args[0] as number) > (args[1] as number);


        }
        return new FunCall(func, es);

    }
    private static LEQ(es: Expr[]) {
        const func: functionType = (...args)=> {
                return (args[0] as number) < (
                    args[1] as number);


        }
        return new FunCall(func, es);

    }

    private static LEQUALS(es: Expr[]) {
        const func: functionType = (...args)=> {
                return (args[0] as number) <= (
                    args[1] as number);


        }
        return new FunCall(func, es);

    }

    private static GEQUALS(es: Expr[]) {
        const func: functionType = (...args)=> {
                return (args[0] as number) >= (
                    args[1] as number);


        }
        return new FunCall(func, es);

    }


    /**
     * DIVIDE is a function that we implemented ourselves to divide two numbers
     */
    private static DIVIDE(es: Expr[]) {
        const func: functionType = (...args)=> {
            return (args[0] as number)/(args[1] as number);
        }
        return new FunCall(func, es)
    }

    /**
     * ADD is a function that we implemented ourselves to add two or more numbers
     */

    private static ADD(es: Expr[]) {
        const func: functionType = (...args)=> {
            return (args[0] as number) + (args[1] as number);
        }
        return new FunCall(func, es)
    }
    /**
     * SUB is a function that we implemented ourselves to subtract two or more numbers
     */
    private static SUB(es: Expr[]) {
        const func: functionType = (...args)=> {
            return (args[0] as number) - (args[1] as number);
        };
        return new FunCall(func, es);
    }






    public override Eval(sheet: Sheet, col: number, row: number): Value {

        // Special case for lazy evaluation functions like IF and CHOOSE
        if (this.nonStrict) {
            if (!this.isChoose) {
                if (this.FindBoolValue(sheet, col, row)) {
                    return this.es[1].Eval(sheet, col, row);
                } else {
                    return this.es[2].Eval(sheet, col, row);
                }
            } else {
                return this.es[(this.es[0].Eval(sheet,col,row).ToObject() as number)].Eval(sheet, col, row);
            }
        }

        const args = FunCall.getExprValues(sheet, col, row, this.es);

        console.log("Args before error check:", args);
        // Check for error values
        function findErrorValue(arg: any): ErrorValue | null {
            if (arg instanceof ErrorValue) {
                return arg;
            } else if (Array.isArray(arg)) {
                for (const inner of arg) {
                    const found = findErrorValue(inner);
                    if (found) return found;
                }
            }
            return null;
        }

        const errorArg = findErrorValue(args);
        if (errorArg) {
            return errorArg;
        }


        // Flatten nested arrays consistently before passing to function.
        // We need to do this because the recursive call in getExprValues()
        // creates nested array arguments which cannot be handled by some
        // Formula.js functions such as WORKDAY which takes string array
        // arguments.
        const flattenedArgs = args.map(arg => {
            if (Array.isArray(arg) && arg.length === 1 && Array.isArray(arg[0])) {
                return arg[0]; // Flatten exactly one level if needed
            }
            return arg;
        });

        // Then we call the function (tied to this instance of FunCall) on each element in the args array
        // and store the result in a variable called 'result':
        const result = this.function(...flattenedArgs as (string | number | ErrorValue | number[] | string[])[]);

        // If the return type is Date:
        if (result instanceof Date) {
            // We have to cast the result as a Date before calling toString() because the DATE function returns
            // an object of type Date:
            return TextValue.Make((result as Date).toString());
        }

        // If the return type is number:
        if (typeof result === "number") {
            return NumberValue.Make(result as number);
        }

        // If the return type is string:
        if (typeof result === "string") {
            return TextValue.Make(result as string);
        }

        // If the return type is boolean:
        if (typeof result === "boolean") {
            return TextValue.Make((result as boolean).toString());
        }

        if (Array.isArray(result)) {
            const values: Value[][] = [];

            // Works for a column-oriented result:
            values[0] = [];

            // Fill the column with values
            for (let i = 0; i < result.length; i++) {
                values[0][i] = NumberValue.Make(result[i]);
            }

            // Create ArrayExplicit with coordinates
            const start = new SuperCellAddress(0, 0);
            const end = new SuperCellAddress(0, result.length - 1);

            return new ArrayExplicit(start, end, values);
        }

        return ErrorValue.Make("Function not implemented"); // If the function is not implemented we return an ErrorValue.
    }

    private FindBoolValue(sheet: Sheet, col: number, row: number) {
        let conditionValue = false;

        const args_0: Value = this.es[0].Eval(sheet, col, row);


        if (args_0 instanceof NumberValue) {
            conditionValue = NumberValue.ToBoolean(args_0) as unknown as boolean;
        } else if (args_0 instanceof TextValue) {
            const text: string = TextValue.ToString(args_0)!;
            conditionValue = text.toLowerCase() === "true" || text === "1";
        }
        return conditionValue;
    }

    /**
     * getExprValues() is a helper method we made for Eval(). Its purpose is to return an array of the
     * expression values (in their primitive form). We use map() to call the Eval() function on all
     * the expressions in the es-array.
     * - If the expr is an instance of ExprArray then we are dealing with a nested array. Therefore,
     * we call getExprValues() recursively on this expr and return the resulting array from this call.
     * - If the value is an instance of ErrorValue we simply return this ErrorValue.
     * - If the value is an instance of NumberValue we extract the number from them using ToNumber().
     * - If the expr holds a TextValue we extract the string from it using ToString().
     * - If the value is an instance of ArrayView, we create a result array where all the values of the ArrayView are pushed onto.
     * - Otherwise, we return null.
     *
     * We store the result in an array called args of (string | number | object | null | undefined)[].
     * @param sheet
     * @param col
     * @param row
     * @param es
     * @public
     */
    public static getExprValues(sheet: Sheet, col: number, row: number, es: Expr[]) {

        const args: (string | number | object | null | undefined)[] = es.map(expr => {

            if (expr instanceof ExprArray) { // E.g. [2,4] in GUI
                return FunCall.getExprValues(sheet, col, row, expr.GetExprArray());
            }
            const value = expr.Eval(sheet, col, row);

            if (value instanceof ErrorValue) {
                return value;
            }
            if (value instanceof NumberValue) {
                return NumberValue.ToNumber(value)
            }
            if (value instanceof TextValue) {
                console.log("reached here")
                console.log(TextValue.ToString(value))
                return TextValue.ToString(value)
            }
            if (value instanceof ArrayView) { // E.g. A1:C3 in GUI
                const result = [];

                for (let r = 0; r < value.Rows; r++) {

                    for (let c = 0; c < value.Cols; c++) {

                        const cellValue = value.Get(c, r);
                        if (cellValue instanceof NumberValue) {
                            result.push(NumberValue.ToNumber(cellValue));
                        }
                        else if (cellValue instanceof ErrorValue) {
                            result.push(cellValue);
                        }
                    }
                }
                return result;
            }
            return null;
        });
        return args;
    }

    public override Move(deltaCol: number, deltaRow: number): Expr {
        const newEs: Expr[] = new Array(this.es.length);

        for (let i = 0; i < this.es.length; i++) {
            newEs[i] = this.es[i].Move(deltaCol, deltaRow);
        }
        return new FunCall(this.function, newEs);
    }

    // Can be copied with sharing if arguments can
    public override CopyTo(col: number, row: number): Expr {
        let same = true;
        const newEs: Expr[] = new Array(this.es.length);

        for (let i = 0; i < this.es.length; i++) {
            newEs[i] = this.es[i].CopyTo(col, row);
            same = same && (newEs[i] === this.es[i]); // sets 'same' to false if newEs[i] and this.es[i] are different.
        }

        if (same) {
            return this;
        } else {
            return new FunCall(this.function, newEs);
        }
    }

    public override InsertRowCols(modSheet: Sheet, thisSheet: boolean, R: number, N: number, r: number, doRows: boolean): Adjusted<Expr> {
        const newEs: Expr[] = new Array(this.es.length);
        let upper: number = Number.MAX_VALUE;
        let same = true;

        for (let i = 0; i < this.es.length; i++) {
            const ae: Adjusted<Expr> = this.es[i].InsertRowCols(modSheet, thisSheet, R, N, r, doRows);
            upper = Math.min(upper, ae.maxValidRow);
            same = same && ae.isUnchanged;
            newEs[i] = ae.type;
        }
        return new Adjusted<Expr>(new FunCall(this.function, newEs), upper, same);
    }


    // Show infixed operators as infix and without excess parentheses
    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        const stringArray: string[] = [];
        const pre = 0; //TODO: Fix fixity

        if (pre === 0) { // Not operator
            stringArray.push(this.function.name + "(");
            for (let i = 0; i < this.es.length; i++) {
                if (i > 0) {
                    stringArray.push(", ");
                }
                stringArray.push(this.es[i].Show(col, row, 0, fo));
            }
            stringArray.push(")");
        } else { // Operator.  Assume es.Length is 1 or 2
            if (this.es.length === 2) {
                // If precedence lower than context, add parens
                if (pre < ctxpre) {
                    stringArray.push("(");
                }
                stringArray.push(this.es[0].Show(col, row, pre, fo));
                stringArray.push(this.function.name);
                // Only higher precedence right operands avoid parentheses
                stringArray.push(this.es[1].Show(col, row, pre + 1, fo));
                if (pre < ctxpre) {
                    stringArray.push(")");
                }
            } else if (this.es.length == 1) {
                stringArray.push(this.function.name === "NEG" ? "-" : this.function.name);
                stringArray.push(this.es[0].Show(col, row, pre, fo));
            } else {
                throw new ImpossibleException("Operator not unary or binary");
            }
        }
        return stringArray.join(""); // The join() method "creates and returns a new string by concatenating all of the elements in this array".
    }


    override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void): void {
        this.es.forEach(e => {
            e.VisitRefs(refSet, refAct, areaAct);
        });
    }

    public override DependsOn(here: FullCellAddress, dependsOn: (fca: FullCellAddress) => void): void {
        this.es.forEach(e => {
            e.DependsOn(here, dependsOn);
        });
    }

    public override get isVolatile(): boolean {
        if (this.function.name == "RAND" || this.function.name == "NOW") {
            return true

        }
        this.es.forEach(e => {
            if(e.isVolatile)
                return true;
        })
        return false;
    }
}

/**
 * A RefSet is a set of CellRefs and CellAreas already seen by a VisitRefs visitor.
 */
class RefSet {
    private readonly cellRefsSeen: Set<CellRef> = new Set<CellRef>();
    private readonly cellAreasSeen: Set<CellArea> = new Set<CellArea>();

    public Clear() {
        this.cellRefsSeen.clear();
        this.cellAreasSeen.clear();
    }

    public SeenBefore(arg1: CellRef | CellArea): boolean {
        if (arg1 instanceof CellRef) {
            return !this.cellRefsSeen.add(arg1 as CellRef);
        } else {
            return !this.cellAreasSeen.add(arg1 as CellArea);
        }
    }
}

export class CellRef extends Expr {
    public readonly raref: SuperRARef;
    public readonly sheet: Sheet;

    constructor(sheet: Sheet, raref: SuperRARef) {
        super();
        this.sheet = sheet;
        this.raref = raref;
    }

    public override Eval(sheet: Sheet, col: number, row: number): Value {


        console.log(`Entered CellRef eval with values, col: ${col}, row: ${row}`)
        console.log(sheet.Get(col, row))

        console.log(`Found values, col: ${col}, row: ${row}`);
        console.log(this.raref.address(col, row))
        const cell: Cell | null = (this.sheet ?? sheet).Get(this.raref.address(col, row).col, this.raref.address(col, row).row)!; // ca.col = 0, ca.row = 0
        console.log(this.raref.colRef, this.raref.rowRef);
        if (cell !== undefined && cell !== null) {
            return cell.Eval(sheet, col, row) as Value;
        } else {
            return TextValue.Make(ErrorValue.refError.message);
        }
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

    public AddToSupport(supported: Sheet, col: number, row: number, cols: number, rows: number) {
        const referredSheet = this.sheet ?? supported;
        const ca: number = this.raref.colRef,
            ra: number = this.raref.rowRef;
        const r1: number = row,
            r2: number = row + rows - 1,
            c1: number = col,
            c2: number = col + cols - 1;
        let referredCols: Interval, referredRows: Interval;
        let supportedCols: (arg: number) => Interval;
        let supportedRows: (arg: number) => Interval;
        [referredCols, supportedCols] = CellRef.RefAndSupp(this.raref.colAbs, ca, c1, c2);
        [referredRows, supportedRows] = CellRef.RefAndSupp(this.raref.rowAbs, ra, r1, r2);

        if (referredCols.length() < referredRows.length()) {
            referredCols.forEach((c) => {
                let suppCols: Interval = supportedCols(c);
                referredRows.forEach((r) => {
                    referredSheet.AddSupport(c, r, supported, suppCols, supportedRows(r));
                });
            });
        } else {
            referredRows.forEach((r) => {
                let suppRows: Interval = supportedRows(r);
                referredCols.forEach((c) => {
                    referredSheet.AddSupport(c, r, supported, supportedCols(c), suppRows);
                });
            });
        }
    }

    public override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void) {
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

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        const s = this.raref.show(col, row, fo);
        return this.sheet == null ? s : this.sheet.getName() + "!" + s;
    }

    private static RefAndSupp(abs: boolean, ra: number, r1: number, r2: number): [Interval, (arg: number) => Interval] {
        let referred: Interval;
        let supported: (arg: number) => Interval;

        if (abs) {
            referred = new Interval(ra, ra);
            supported = (_r) => new Interval(r1, r2);
        } else {
            referred = new Interval(r1 + ra, r2 + ra);
            supported = (r) => new Interval(r - ra, r - ra);
        }

        return [referred, supported];
    }
}

export class CellArea extends Expr {
    private readonly ul: SuperRARef;
    private readonly lr: SuperRARef;
    public readonly sheet: Sheet;
    constructor(
        sheet: Sheet,
        ulColAbs: SuperRARef | boolean,
        ulColRef: SuperRARef | number,
        ulRowAbs?: boolean,
        ulRowRef?: number,
        lrColAbs?: boolean,
        lrColRef?: number,
        lrRowAbs?: boolean,
        lrRowRef?: number,
    ) {
        super();
        this.sheet = sheet;

        if (ulColAbs instanceof SuperRARef) {
            this.ul = ulColAbs;
            this.lr = ulColRef as SuperRARef;
        } else {

            this.ul = new SuperRARef(ulColAbs as boolean, ulColRef as number, ulRowAbs as boolean, ulRowRef as number);
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

            return ArrayView.Make(ulCa,lrCa, this.sheet ?? fca as Sheet)

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

    public AddToSupport(supported: Sheet, col: number, row: number, cols: number, rows: number) {
        const referredSheet = this.sheet ?? supported;
        let referredRows: Interval, referredCols: Interval;
        let supportedCols: (arg: number) => Interval;
        let supportedRows: (arg: number) => Interval;
        const ra = this.ul.rowRef, rb = this.lr.rowRef, r1 = row, r2 = row + rows - 1;
        const ca = this.ul.colRef, cb = this.lr.colRef, c1 = col, c2 = col + cols - 1;

        [referredRows, supportedRows] = CellArea.RefAndSupp(this.ul.rowAbs, this.lr.rowAbs, ra, rb, r1, r2);
        [referredCols, supportedCols] = CellArea.RefAndSupp(this.ul.colAbs, this.lr.colAbs, ca, cb, c1, c2);

        if(referredCols.length() < referredRows.length()) {
            referredCols.forEach((c) => {
                let suppCols = supportedCols(c);
                referredRows.forEach((r) => {
                    referredSheet.AddSupport(c, r, supported, suppCols, supportedRows(r));
                });
            });
        } else {
            referredRows.forEach((r) => {
                let suppRows = supportedRows(r);
                referredCols.forEach((c) => {
                    referredSheet.AddSupport(c, r, supported, supportedCols(c), suppRows);
                });
            });
        }
    }

    private static RefAndSupp(ulAbs:boolean, lrAbs:boolean, ra:number, rb:number, r1:number, r2:number):  [Interval, (arg: number) => Interval] {
        if (ulAbs) {
            if (lrAbs) {
                [ra, rb] = [Math.min(ra, rb), Math.max(ra, rb)];
                return [new Interval(ra, rb), _ => new Interval(r1, r2)];
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


    public override VisitRefs(refSet: RefSet, refAct: (cellRef: CellRef) => void, areaAct: (cellArea: CellArea) => void) {
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

    public override Show(col: number, row: number, ctxpre: number, fo: Formats): string {
        const s = this.ul.show(col, row, fo) + ":" + this.lr.show(col, row, fo);
        return this.sheet == null ? s : this.sheet.getName() + "!" + s;
    }
}
