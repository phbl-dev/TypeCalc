import type { Workbook } from "../Workbook";
import { type Cell, Formula, NumberCell, QuoteCell, TextCell } from "../Cells";
import { CellArea, CellRef, Error, type Expr, FunCall, NumberConst, TextConst } from "../Expressions";
import { A1RARef, A1RefCellAddress, R1C1RARef, RARefCellAddress, type SuperRARef } from "../CellAddressing";
import { ErrorValue } from "../ErrorValue";
import type { Sheet } from "../Sheet";
import { SpreadsheetParser } from "./Parser";
import { type CstNode, Lexer } from "chevrotain";
import { SpreadsheetLexer } from "./Lexer";
import { NumberValue } from "../NumberValue";
import { json } from "node:stream/consumers";

/**
 * @class
 * @desc <b>Visitor Class </b>.This class relies on the implementation of the SpreadSheetParser class to generate a CST (Concrete Syntax Tree),
 * to which is it traversing the tree, and manipulates the outcome.
 * @example new SpreadsheetVisitor().ParseCell("= 10 + 10)", new Workbook(), 1, 1); // Can be used to parse the input "= 10 + 10".
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
     * @param parseString
     * @param workbook
     * @param col
     * @param row
     * @constructor
     */
    public ParseCell(parseString: string, workbook: Workbook, col: number, row: number): Cell | null {
        this.workbook = workbook;
        this.col = col;
        this.row = row;

        this.Parse(parseString);

        return this.cell;
    }

    protected Parse(input: string): void {
        const parser = new SpreadsheetParser();
        const _ = new Lexer(SpreadsheetLexer.AllTokens);
        parser.input =  _.tokenize(input).tokens;
        const cst:CstNode = parser.cellContents();
        this.visit(cst);
    }

    protected powFactor(ctx: any): Expr {
        let e2: Expr;

        let e = this.visit(ctx["factor"][0]);

        if (ctx["factor"].image === "^") {
            e2 = this.visit(ctx["factor"][1]);
            e = FunCall.Make("POWER", [e, e2]);
        }
        return e;
    }

    protected logicalTerm(ctx: any): Expr {
        let e: Expr;

        // Get the first term
        e = this.visit(ctx["term"][0]);

        // Process all subsequent term-operator pairs
        if (ctx["addOp"] && ctx["addOp"].length > 0) {
            for (let i = 0; i < ctx["addOp"].length; i++) {
                // Get the operator
                let op = this.visit(ctx["addOp"][i]);

                // Transform the operator name as needed
                if (op === "+") {
                    op = "ADD";
                } else if (op === "-") {
                    op = "SUB";
                } else if (op === "&") {
                    op = "CONCATENATE";
                }

                // Get the next term
                const e2 = this.visit(ctx["term"][i + 1]);

                // Create a function call for this operation
                e = FunCall.Make(op, [e, e2]);
            }
        }

        return e;
    }

    protected number(ctx: any): number {

        return Number.parseFloat(ctx["Number"][0].image);
    }

    protected application(ctx: any): Expr {

        let s: string;
        let es: Expr[];
        let e: Expr;


        s = ctx["Identifier"][0].image;

        s = s.toUpperCase();

        if (ctx["exprs1"]) {
            es = this.visit(ctx["exprs1"]);
            e = FunCall.Make(s, es);
        } else {
            e = FunCall.Make(s, []);
        }

        return e;
    }

    Name(ctx: any): string {
        return this.visit(ctx["name"][0].image);
    }

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
        console.log(ctx)
        let op = "";
        if (ctx.Equals) {
            op = "EQUALS";
        } else if (ctx.NotEqual) {
            op = "NOTEQUALS";
        } else if (ctx.LessThan) {
            op = "LEQ";
        } else if (ctx.LessThanOrEqual) {
            op = "LEQUALS";
        } else if (ctx.GreaterThan) {
            op = "GEQ";
        } else if (ctx.GreaterThanOrEqual) {
            op = "GEQUALS";
        }
        return op;
    }

    protected mulOp(ctx: any): string {

        if (ctx.Multiply) {
            return "PRODUCT";
        } else {
            return "DIVIDE";
        }
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
            s1 = this.workbook.get(sheetName.substring(0, sheetName.length - 1));
            if (s1 === null) {
                sheetError = true;
            }
        }
        if (ctx["raref"]) {
            r1 = this.visit(ctx["raref"][0]);


            if (sheetError) {
                e = new Error(ErrorValue.refError);
            } else {
                e = new CellRef(s1 as unknown as Sheet, r1);
            }

            if (ctx["raref"][1]) {
                r2 = this.visit(ctx["raref"][1]);

                if (sheetError) {
                    e = new Error(ErrorValue.refError);
                } else {
                    e = new CellArea(s1 as unknown as Sheet, r1 as SuperRARef, r2 as SuperRARef);
                }
            }
        }

        if (ctx["Minus"]) {

            const innerExpr = this.visit(ctx["factor"]);

            if (innerExpr instanceof NumberConst) {
                e = new NumberConst(-innerExpr.value.value);
            } else {
                e = FunCall.Make("NEG", [e]);
            }


        }

        if (ctx["number"]) {

            d = Number.parseInt(ctx["number"][0].children["Number"][0].image);

            e = new NumberConst(d);
        }


        if (ctx["StringLiteral"]) {
            const textValue = ctx["StringLiteral"][0].image;
            e = new TextConst(textValue.substring(1, textValue.length - 1));
        }

        if (ctx["LParen"]) {
            e = this.visit(ctx["expression"][0]);
        }
        return e;
    }

    protected raref(ctx: any) {
        let raref;


        if (ctx["A1Ref"]) {
            const token = ctx["A1Ref"][0].image
            raref = new A1RARef(token, this.col,this.row);

        } else if (ctx["XMLSSRARef11"]) {
            const token = ctx["XMLSSRARef11"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef12"]) {
            const token = ctx["XMLSSRARef12"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef13"]) {
            const token = ctx["XMLSSRARef13"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef21"]) {
            const token = ctx["XMLSSRARef21"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef22"]) {
            const token = ctx["XMLSSRARef22"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef23"]) {
            const token = ctx["XMLSSRARef23"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef31"]) {
            const token = ctx["XMLSSRARef31"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef32"]) {
            const token = ctx["XMLSSRARef32"][0];
            raref = new R1C1RARef(token.image);
        } else if (ctx["XMLSSRARef33"]) {
            const token = ctx["XMLSSRARef33"][0];
            raref = new R1C1RARef(token.image);
        }
        return raref;
    }

    protected cellContents(ctx: any): Cell {
        const e:any = this.visit(ctx.expression);


        if (ctx.QuoteCell) {
            const helperConst = ctx["QuoteCell"][0].image
            this.cell = new QuoteCell(ctx["QuoteCell"][0].image.substring(1, helperConst.length - 1));
        } else if (ctx.StringLiteral) {
            const helperConst = ctx["StringLiteral"][0].image

            this.cell = new TextCell(ctx["StringLiteral"][0].image.substring(1, helperConst.length - 1 ));
        } else if (ctx.number) {
            console.log(ctx["number"][0].children["Number"][0].image)
            this.cell = new NumberCell(Number.parseInt(ctx["number"][0].children["Number"][0].image));
        } else if (ctx.Equals) {
            this.cell = Formula.Make(this.workbook, e)!;
        } else if (ctx.Datetime) {
            // Get the datetime string
            let dateTimeStr = ctx["Datetime"][0].image;
            console.log("Original datetime string:", dateTimeStr);

            try {
                // Remove the square brackets while preserving the content
                dateTimeStr = dateTimeStr.replace(/\[/g, '').replace(/\]/g, '');
                console.log("Cleaned datetime string:", dateTimeStr);

                // Parse the date
                const dateObj = new Date(dateTimeStr);

                if (!isNaN(dateObj.getTime())) {
                    // In Excel, dates are stored as days since December 31, 1899
                    // 25569 is the number of days between Jan 1, 1900 and Jan 1, 1970 (Unix epoch)
                    const excelDate = dateObj.getTime() / (24 * 60 * 60 * 1000) + 25569;

                    // Add the fractional day for time
                    const timeOfDay = (dateObj.getHours() * 3600 + dateObj.getMinutes() * 60 + dateObj.getSeconds()) / 86400;
                    const excelDateTime = excelDate + timeOfDay;

                    console.log("Excel datetime value:", excelDateTime);

                    // Create the number cell with the Excel date value
                    this.cell = new NumberCell(excelDateTime);
                } else {
                    console.error("Invalid date after cleaning:", dateTimeStr);
                    this.cell = new NumberCell(0); // Fallback
                }
            } catch (error) {
                console.error("Error processing datetime:", error);
                this.cell = new NumberCell(0); // Fallback
            }
        }

        return this.cell;
    }
}