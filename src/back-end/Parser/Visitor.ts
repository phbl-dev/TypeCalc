import type { Workbook } from "../Workbook";
import { type Cell, Formula, NumberCell, QuoteCell, TextCell } from "../Cells";
import {CellArea, CellRef, Error, type Expr, ExprArray, FunCall, NumberConst, TextConst} from "../Expressions";
import { A1RARef, R1C1RARef, type SuperRARef } from "../CellAddressing";
import { ErrorValue } from "../ErrorValue";
import type { Sheet } from "../Sheet";
import { SpreadsheetParser } from "./Parser";
import { type CstNode, Lexer } from "chevrotain";
import { SpreadsheetLexer } from "./Lexer";
import {NumberValue} from "../NumberValue.ts";

/**
 * @class
 * @desc <b>Visitor Class </b>.This class relies on the implementation of the SpreadSheetParser class to generate a CST (Concrete Syntax Tree),
 * to which is it traversing the tree, and manipulates the outcome.
 * @example new SpreadsheetVisitor().ParseCell("= 10 + 10)", new Workbook(), 1, 1); // Can be used to parse the input "= 10 + 10".
 * Please note, that while this will parse and set the cells up for evaluation, this method doesn't evaluate the cells. This process goes on in the Expressions class.
 */
export class SpreadsheetVisitor extends new SpreadsheetParser().getBaseCstVisitorConstructor() {
    private workbook!: Workbook;
    private cell!: Cell;
    private col!: number;
    private row!: number;


    constructor() {
        super();

        this.validateVisitor();
    }

    /**
     * ParseCell reads a string and inserts the value onto the col and row that is provided.
     * This method should be the only one that is accessed by outside classes.
     * This method is in charge of handling values.
     * @param parseString
     * @param workbook
     * @param col
     * @param row
     * @constructor
     */
    public ParseCell(parseString: string, workbook: Workbook, col: number, row: number): Cell | null | undefined {
        this.workbook = workbook;
        this.col = col;
        this.row = row;

        const parser = new SpreadsheetParser();
        const _ = new Lexer(SpreadsheetLexer.AllTokens);
        parser.input =  _.tokenize(parseString).tokens;
        const cst:CstNode = parser.cellContents();
        this.visit(cst);

        return this.cell;
    }


    /**
     * powFactor (or powerFactor) is the method, that evaluates exponents
     * , which have been written with "^". It is placed in the lowest section of the CST,
     * since it needs to be evaluated prior to other arithmetic rules.
     * @param ctx - the current node in the CST
     * @protected
     */
    protected powFactor(ctx: any): Expr {
        let e2: Expr;

        let e = this.visit(ctx["factor"][0]);

        if (ctx["factor"].image === "^") {
            e2 = this.visit(ctx["factor"][1]);
            e = FunCall.Make("POWER", [e, e2]);
        }
        return e;
    }

    /**
     * logicalTerm is the method, that evaluates the
     * lowest priority arithmetic rules and string concatenation.
     * Since there can be multiple instances of logicalTerms and operators,
     * this method can run multiple times.
     * This follows the $.MANY keyword used in {@link SpreadsheetParser}'s logicalTerm method
     * @param ctx - the current node in the CST
     * @protected
     */
    protected logicalTerm(ctx: any): Expr {
        let e: Expr;

        e = this.visit(ctx["term"][0]);

        if (ctx["addOp"] && ctx["addOp"].length > 0) {
            for (let i = 0; i < ctx["addOp"].length; i++) {
                let op = this.visit(ctx["addOp"][i]);

                if (op === "+") {
                    op = "ADD";
                } else if (op === "-") {
                    op = "SUB";
                } else if (op === "&") {
                    op = "CONCATENATE";
                }
                // It will not parse correctly in the parser class, if there is not a term on the right hand side,
                // Therefore, we never have to account for this in logicalTerm.
                const e2 = this.visit(ctx["term"][i + 1]);

                e = FunCall.Make(op, [e, e2]);
            }
        }

        return e;
    }

    /**
     * Simply, yet extremely important method.
     * This method returns a number, when matched as a rule in the parser.
     * It uses float parsing, since it allows both integers and floating points to exist.
     * @param ctx - the current node in the CST
     * @protected
     */
    protected number(ctx: any): number {

        return Number.parseFloat(ctx["Number"][0].image);
    }

    /**
     * this method is used when word-based formulas are to be parsed.
     * Examples of this include "SUM", "FREQUENCY", "CHOOSE", which are identified as identifiers and combined with exprs1.
     * @param ctx - the current node in the CST
     * @protected
     */
    protected application(ctx: any): Expr {

        let s: string;
        let es: Expr[];
        let e: Expr;

        s = ctx["Identifier"][0].image;

        if (ctx["exprs1"]) {
            es = this.visit(ctx["exprs1"]);
            e = FunCall.Make(s.toUpperCase(), es); // es is an array of Expr[], which is returned by following exprs1.
        } else {
            e = FunCall.Make(s.toUpperCase(), []); // TODO: Understand why this makes sense?
        }

        return e;
    }

    /**
     * This method collects expressions, which are going to be evaluated by an application formula.
     * It returns an array of expressions, which are evaluated left to right.
     * @param ctx
     */
    exprs1(ctx: any): Expr[] {

        const elist: Expr[] = [];

        const e1 = this.visit(ctx["expression"][0]);
        elist.push(e1);

        if (ctx["expression"].length > 1) {
            for (let i = 1; i < ctx["expression"].length; i++) {
                const e2 = this.visit(ctx["expression"][i]);
                elist.push(e2);
            }
        }
        return elist;
    }

    protected addOp(ctx: any): string {

        let op = "";

        if (ctx.Plus) {
            op = "+";
        } else if (ctx.Minus) {
            op = "-";
        } else if (ctx.Ampersand) {
            op = "&";
        }
        return op;
    }

    protected logicalOp(ctx: any): string {
        if (ctx.Equals) return "EQUALS";
        if (ctx.NotEqual) return "NOTEQUALS";
        if (ctx.LessThan) return "LEQ";
        if (ctx.LessThanOrEqual) return "LEQUALS";
        if (ctx.GreaterThan) return "GEQ";
        if (ctx.GreaterThanOrEqual) return "GEQUALS";

        return ""
    }

    protected mulOp(ctx: any): string {
        return ctx.Multiply ? "PRODUCT" : "DIVIDE"
    }

    protected term(ctx: any): Expr {
        let e = this.visit(ctx["powFactor"][0]);

        if (ctx["mulOp"] && ctx["mulOp"].length > 0) {
            for (let i = 0; i < ctx["mulOp"].length; i++) {
                const op = this.visit(ctx["mulOp"][i]);

                const e2 = this.visit(ctx["powFactor"][i + 1]);

                e = FunCall.Make(op, [e, e2]);
            }
        }

        return e;
    }

    protected expression(ctx: any): Expr {
        let e: Expr;

        e = this.visit(ctx["logicalTerm"][0]);

        if (ctx["Operator"] && ctx["logicalTerm"].length > 1) {
            for (let i = 0; i < ctx["Operator"].length; i++) {
                const op = this.visit(ctx["Operator"][i]);

                const nextTerm = this.visit(ctx["logicalTerm"][i + 1]);

                e = FunCall.Make(op, [e, nextTerm]);
            }
        }

        return e;
    }


    protected factor(ctx: any): Expr {


        let r1, r2;
        let s1 = null;
        let d: number;
        let sheetError = false;
        let e = null;

        if (ctx["application"]) {
            e = this.visit(ctx["application"]);
        }

        if (ctx["SheetRef"]) {
            const sheetName = ctx["SheetRef"][0].image;
            s1 = this.workbook.getSheet(sheetName.substring(0, sheetName.length - 1));
            if (s1 === null) {
                sheetError = true;
            }
        }
        if (ctx["raref"]) {
            r1 = this.visit(ctx["raref"][0]);


            e = sheetError ? new Error(ErrorValue.refError) :  new CellRef(s1 as unknown as Sheet, r1);

            if (ctx["raref"][1]) {
                r2 = this.visit(ctx["raref"][1]);

                e = sheetError ? new Error(ErrorValue.refError) : new CellArea(s1 as unknown as Sheet, r1 as SuperRARef, r2 as SuperRARef);
            }
        }

        if (ctx["NEGATIVE"] ) {

            const innerExpr = this.visit(ctx["NEGATIVE"]);

            e = typeof innerExpr === "number" ? new NumberConst(-innerExpr) : FunCall.Make("NEG", [innerExpr]);


        }

        if (ctx["number"]) {

            d = Number.parseFloat(ctx["number"][0].children["Number"][0].image);

            e = new NumberConst(d);
        }


        if (ctx["StringLiteral"]) {
            const textValue = ctx["StringLiteral"][0].image;
            e = new TextConst(textValue.substring(1, textValue.length - 1));
        }



        if (ctx["LParen"]) {
            e = this.visit(ctx["expression"][0]);
        }


        /**
         * Custom case where we want arrays to be inserted.
         */
        if (ctx["LBracket"]) {
            const elements: Expr[] = [];

            if (ctx["ArrayElement"]) {
                for (let i = 0; i < ctx["ArrayElement"].length; i++) {
                    const element = this.visit(ctx["ArrayElement"][i]);
                    elements.push(element);
                }
            }
            e = FunCall.Make("ARRAY",[ExprArray.MakeExprArray(elements)])


        }
        return e;

    }

    protected raref(ctx: any) {
        if (ctx["A1Ref"]) {
            return new A1RARef(ctx["A1Ref"][0].image, this.col, this.row);
        }

        const r1c1Key = Object.keys(ctx).find(key => key.startsWith("XMLSSRARef"))!;
        if (r1c1Key) {
            return new R1C1RARef(ctx[r1c1Key][0].image);
        }


    }

    protected cellContents(ctx: any): Cell {
        const e:any = this.visit(ctx.expression);

        if (ctx.Equals) {
            this.cell = Formula.Make(this.workbook, e)!;
        }
        else if (ctx.QuoteCell) {
            const helperConst = ctx["QuoteCell"][0].image
            this.cell = new QuoteCell(helperConst.substring(1, helperConst.length - 1));
        } else if (ctx.StringLiteral) {
            const helperConst = ctx["StringLiteral"][0].image
            this.cell = new TextCell(helperConst.substring(1, helperConst.length - 1));
        }
            else if (ctx.Minus) {
            this.cell = new NumberCell(Number.parseFloat("-" + ctx["number"][0].children["Number"][0].image));

        } else if (ctx.number) {
            this.cell = new NumberCell(Number.parseFloat(ctx["number"][0].children["Number"][0].image));
        } else if (ctx.Datetime) {
            this.cell = new NumberCell(NumberValue.DoubleFromDateTimeTicks(ctx["Datetime"][0].image));
                }


        return this.cell;
    }
}