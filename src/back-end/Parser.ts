import {createToken, CstElement, type CstNode, CstParser, Lexer, type ParserMethod, type TokenType} from "chevrotain";
import type {Workbook} from "./Workbook.ts";
import {BooleanCell, Cell, Formula, NumberCell, QuoteCell, TextCell} from "./Cells.ts";
import {
    BooleanConst,
    CellArea,
    CellRef,
    Error,
    Expr,
    ExprArray,
    FunCall,
    NumberConst,
    TextConst
} from "./Expressions.ts";
import {ErrorValue, NumberValue} from "./Values.ts";
import type {Sheet} from "./Sheet.ts";
import {A1RARef, R1C1RARef, SuperRARef} from "./CellAddressing.ts";

/**
 * @class SpreadsheetLexer
 * @desc <B>Lexer class</b>. The purpose of this class is to store the Tokens, which are lexed during the parsing step.
 * Each of the Tokens is defined using ECMAscript regex and the class utilises the chevrotain package.
 * The all follow the same syntax, containing a name and a pattern.
 * If you are looking for documentation, please refer to
 * [Chevrotain Lexing Documention ](https://chevrotain.io/docs/tutorial/step1_lexing.html)
 */
export class SpreadsheetLexer {
    static WhiteSpace: TokenType = createToken({name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED});
    static Datetime: TokenType = createToken({
        name: "Datetime",
        pattern: /\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?:\.\d+)?)?/
    });

    static NUMBER: TokenType = createToken({name: "Number", pattern: /\d+(\.\d+)?([eE][-+]?\d+)?/});
    static Colon: TokenType = createToken({name: "Colon", pattern: /:/});
    static Identifier: TokenType = createToken({name: "Identifier", pattern: /[A-Za-z][A-Za-z0-9_]*/}); // aka name in ATG file.
    static StringLiteral: TokenType = createToken({name: "StringLiteral", pattern: /"([^"\\]|\\.)*"/});
    static TRUE:TokenType = createToken({name: "TRUE", pattern: /true/i});
    static FALSE:TokenType = createToken({name: "FALSE", pattern: /false/i});
    static QuoteCell: TokenType = createToken({
        name: "QuoteCell",
        pattern: /'([^'\\]|\\.)*'/,
        longer_alt: SpreadsheetLexer.StringLiteral
    });
    static LBracket: TokenType = createToken({name: "LBracket", pattern: /\[/});
    static RBracket: TokenType = createToken({name: "RBracket", pattern: /]/});
    static Ampersand: TokenType = createToken({name: "Ampersand", pattern: /&/});
    static LParen: TokenType = createToken({name: "LParen", pattern: /\(/});
    static RParen: TokenType = createToken({name: "RParen", pattern: /\)/});
    static Comma: TokenType = createToken({name: "Comma", pattern: /,/});
    static Semicolon: TokenType = createToken({name: "Semicolon", pattern: /;/});
    static Plus: TokenType = createToken({name: "Plus", pattern: /\+/});
    static Minus: TokenType = createToken({name: "Minus", pattern: /-/});
    static Multiply: TokenType = createToken({name: "Multiply", pattern: /\*/});
    static Divide: TokenType = createToken({name: "Divide", pattern: /\//});
    static Power: TokenType = createToken({name: "Power", pattern: /\^/});
    static Equals: TokenType = createToken({name: "Equals", pattern: /=/});
    static NotEqual: TokenType = createToken({name: "NotEqual", pattern: /<>/});
    static LessThanOrEqual: TokenType = createToken({name: "LessThanOrEqual", pattern: /<=/});
    static GreaterThanOrEqual: TokenType = createToken({name: "GreaterThanOrEqual", pattern: />=/});
    static LessThan: TokenType = createToken({name: "LessThan", pattern: /</});
    static GreaterThan: TokenType = createToken({name: "GreaterThan", pattern: />/});
    static SheetRef: TokenType = createToken({name: "SheetRef", pattern: /[A-Za-z0-9_]+!/});
    static A1Ref: TokenType = createToken({name: "A1Ref", pattern: /\$?[A-Z]+\$?[0-9]+|\$?[A-Z]+[0-9]+/});
    static XMLSSRARef11: TokenType = createToken({name: "XMLSSRARef11", pattern: /RC/}); // Match RC
    static XMLSSRARef12: TokenType = createToken({name: "XMLSSRARef12", pattern: /RC[0-9]+/}); // Match RC10
    static XMLSSRARef13: TokenType = createToken({name: "XMLSSRARef13", pattern: /RC\[[+-]?[0-9]+]/}); // Match RC[-90]
    static XMLSSRARef21: TokenType = createToken({name: "XMLSSRARef21", pattern: /R\[[0-9]+]C/}); // Match R[90]C
    static XMLSSRARef22: TokenType = createToken({name: "XMLSSRARef22", pattern: /R\[[0-9]+]C\[[0-9]+]/}); // Match R[90]C[90]
    static XMLSSRARef23: TokenType = createToken({name: "XMLSSRARef23", pattern: /R[0-9]+C\[[+-]?[0-9]+]/}); // Match R10C[90]
    static XMLSSRARef31: TokenType = createToken({name: "XMLSSRARef31", pattern: /R\[[+-]?[0-9]+]C/}); // Match R[+9]C
    static XMLSSRARef32: TokenType = createToken({name: "XMLSSRARef32", pattern: /R\[[+-]?[0-9]+]C\[[0-9]+]/}); // Match R[+9]C[9]
    static XMLSSRARef33: TokenType = createToken({name: "XMLSSRARef33", pattern: /R\[[+-]?[0-9]+]C\[[+-]?[0-9]+]/}); // Match R[-0000]C[-10]

    /**
     * Array of all tokens used in the project.
     * Please note that the ordering of Tokens are important,
     * since they determine which tokens are read first.
     *
     * SpreadsheetLexer.XMLSSRARef11 must be defined after SpreadsheetLexer.XMLSSRARef12,
     * This is because they share elements in their regex expressions,
     * and if XMLSSRARef11 is defined first it will ignore XMLSSRARef12
     */
    static AllTokens: TokenType[] = [

        SpreadsheetLexer.A1Ref,
        SpreadsheetLexer.XMLSSRARef33,
        SpreadsheetLexer.XMLSSRARef32,
        SpreadsheetLexer.XMLSSRARef31,
        SpreadsheetLexer.XMLSSRARef23,
        SpreadsheetLexer.XMLSSRARef22,
        SpreadsheetLexer.XMLSSRARef21,
        SpreadsheetLexer.XMLSSRARef13,
        SpreadsheetLexer.XMLSSRARef12,
        SpreadsheetLexer.XMLSSRARef11,
        SpreadsheetLexer.SheetRef,
        SpreadsheetLexer.Ampersand,
        SpreadsheetLexer.TRUE,
        SpreadsheetLexer.FALSE,
        SpreadsheetLexer.Identifier,

        SpreadsheetLexer.LBracket,
        SpreadsheetLexer.RBracket,
        SpreadsheetLexer.WhiteSpace,
        SpreadsheetLexer.Datetime,

        SpreadsheetLexer.NUMBER,
        SpreadsheetLexer.QuoteCell,

        SpreadsheetLexer.StringLiteral,
        SpreadsheetLexer.LessThanOrEqual,
        SpreadsheetLexer.GreaterThanOrEqual,
        SpreadsheetLexer.NotEqual,
        SpreadsheetLexer.LessThan,
        SpreadsheetLexer.GreaterThan,
        SpreadsheetLexer.LParen,
        SpreadsheetLexer.RParen,
        SpreadsheetLexer.Comma,
        SpreadsheetLexer.Semicolon,
        SpreadsheetLexer.Colon,
        SpreadsheetLexer.Plus,
        SpreadsheetLexer.Minus,
        SpreadsheetLexer.Multiply,
        SpreadsheetLexer.Divide,
        SpreadsheetLexer.Power,
        SpreadsheetLexer.Equals,
    ];
}

/**
 * @class
 * @remarks when testing, It is highly useful to look at the JSON.stringify command.
 * This provides a good insight into what goes on in the tree.
 * @desc <b> Parser class </b> The parser class follows the parsing rules laid out by the Spreadsheet.ATG file from CoreCalc
 * The rules of parsing of tokens are used subsequently to manipulate cellContents in the visitor class.
 * It parses the tokens, and returns them in a CST (Concrete Syntax tree).
 * Please note that it is not possible to manipulate the parser class, only define its rules.
 *
 * If the goal is to manipulate the CST, please use the Visitor class.
 * If you are looking for documentation, please refer to
 * [Chevrotain Parser Documentation ](https://chevrotain.io/docs/tutorial/step2_parsing.html#first-rule)
 */
export class SpreadsheetParser extends CstParser {
    // @ts-ignore
    [x: string]: ParserMethod<unknown[], CstNode>;
    constructor() {
        super(SpreadsheetLexer.AllTokens);

        const $:this = this;

        $.RULE("addOp", addOp);
        $.RULE("logicalOp", logicalOp);
        $.RULE("expression", expression);
        $.RULE("logicalTerm", logicalTerm);
        $.RULE("factor", Factor);
        $.RULE("term", term);
        $.RULE("mulOp", mulOp);
        $.RULE("powFactor", powFactor);
        $.RULE("application", application);
        $.RULE("raref", Raref);
        $.RULE("exprs1", exprs1);
        $.RULE("cellContents", cellContents);
        $.RULE("number", NUMBER);

        function addOp() {
            $.OR([
                {
                    ALT: (): void => {
                        $.CONSUME(SpreadsheetLexer.Plus);
                    },
                },
                {
                    ALT: (): void => {
                        $.CONSUME(SpreadsheetLexer.Minus);
                    },
                },
                {
                    ALT: (): void => {
                        $.CONSUME(SpreadsheetLexer.Ampersand);
                    },
                },
            ]);
        }


        function logicalOp() {
            $.OR([
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Equals);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.NotEqual);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.LessThan);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.GreaterThan);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.LessThanOrEqual);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.GreaterThanOrEqual);
                    },
                },
            ]);
        }

        function expression() {
            $.SUBRULE($.logicalTerm);
            $.MANY(() => {
                $.SUBRULE2($.logicalOp, { LABEL: "Operator" });
                $.SUBRULE2($.logicalTerm);
            });
        }

        function logicalTerm() {
            $.SUBRULE($.term);
            $.MANY(() => {
                $.SUBRULE2($.addOp);
                $.SUBRULE3($.term);
            });
        }

        function Factor() {
            return $.OR([
                {
                    ALT: () => {
                        $.SUBRULE($.application);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Minus);
                        $.SUBRULE2($.number, {LABEL: "NEGATIVE"});
                    },
                },

                {
                    ALT: () => {
                        $.OPTION3(() => {
                            $.CONSUME(SpreadsheetLexer.SheetRef);
                        });
                        $.SUBRULE($.raref)
                        $.OPTION4(() => {
                            $.CONSUME(SpreadsheetLexer.Colon);
                            $.SUBRULE2($.raref);
                        });

                    },
                },

                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.LBracket);

                        $.OPTION2(() => {
                            $.SUBRULE2($.factor, { LABEL: "ArrayElement" });

                            $.MANY(() => {
                                $.CONSUME(SpreadsheetLexer.Comma);
                                $.SUBRULE3($.factor,  { LABEL: "ArrayElement" });
                            });
                        });

                        $.CONSUME(SpreadsheetLexer.RBracket);
                    }
                },
                {
                    ALT: () => {
                            $.SUBRULE($.number);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.TRUE);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.FALSE);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.StringLiteral);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.LParen);
                        $.SUBRULE($.expression);
                        $.CONSUME(SpreadsheetLexer.RParen);
                    },
                },
            ]);
        }
        function term() {
            $.SUBRULE($.powFactor);
            $.MANY(() => {
                $.SUBRULE($.mulOp);
                $.SUBRULE2($.powFactor);
            });
        }
        function mulOp() {
            $.OR([
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Multiply);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Divide);
                    },
                },
            ]);
        }
        function powFactor() {
            $.SUBRULE($.factor);

            $.MANY(() => {
                $.CONSUME(SpreadsheetLexer.Power);
                $.SUBRULE2($.factor);
            });
        }
        function application() {
            $.CONSUME(SpreadsheetLexer.Identifier);

            $.CONSUME(SpreadsheetLexer.LParen);

            $.OPTION(() => {
                $.SUBRULE($.exprs1);
            });

            $.CONSUME(SpreadsheetLexer.RParen);
        }

        function Raref() {
            $.OR([
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.A1Ref);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef11);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef12);
                    }
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef13);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef21);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef22);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef23);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef31);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef32);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.XMLSSRARef33);
                    },
                },
            ]);
        }
        function exprs1() {
            $.SUBRULE($.expression);

            $.MANY(() => {
                $.OR([
                    {
                        ALT: () => {
                            $.CONSUME(SpreadsheetLexer.Comma);
                            $.SUBRULE2($.expression);
                        },
                    },
                    {
                        ALT: () => {
                            $.CONSUME(SpreadsheetLexer.Semicolon);
                            $.SUBRULE3($.expression);
                        },
                    },
                ]);
            });
        }

        function cellContents() {
            $.OR([
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Equals);
                        $.SUBRULE($.expression);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.QuoteCell);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Datetime);
                    }
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.StringLiteral);
                    },
                },
                {
                    ALT: () => {
                        $.SUBRULE($.number);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Minus);
                        $.SUBRULE2($.number);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.TRUE);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.FALSE);
                    },
                },
            ]);
            return;
        }
        function NUMBER() {
            $.CONSUME(SpreadsheetLexer.NUMBER);
        }

        $.performSelfAnalysis();
    }
}

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
        parser.input = _.tokenize(parseString).tokens;
        const cst: CstNode = parser.cellContents();
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
    protected powFactor(ctx:any): any {
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
    protected logicalTerm(ctx: any): any {
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
            e = FunCall.Make(s.toUpperCase(), []);
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
            s1 = this.workbook.get(sheetName.substring(0, sheetName.length - 1));
            if (s1 === null) {
                sheetError = true;
            }
        }
        if (ctx["raref"]) {
            r1 = this.visit(ctx["raref"][0]);


            e = sheetError ? new Error(ErrorValue.refError) : new CellRef(s1 as unknown as Sheet, r1);

            if (ctx["raref"][1]) {
                r2 = this.visit(ctx["raref"][1]);

                e = sheetError ? new Error(ErrorValue.refError) : new CellArea(s1 as unknown as Sheet, r1 as SuperRARef, r2 as SuperRARef);
            }
        }

        if(ctx["TRUE"]) {
            e = new BooleanConst(true)
        }

        if(ctx["FALSE"]) {
            e = new BooleanConst(false)
        }


        if (ctx["NEGATIVE"]) {

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
            e = FunCall.Make("ARRAY", [ExprArray.MakeExprArray(elements)])


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
        const e: any = this.visit(ctx.expression);
        if (ctx.Equals) {
            this.cell = Formula.Make(this.workbook, e)!;
        } else if (ctx.QuoteCell) {
            const helperConst = ctx["QuoteCell"][0].image
            this.cell = new QuoteCell(helperConst.substring(1, helperConst.length - 1));
        } else if (ctx.TRUE) {
            this.cell = new BooleanCell(true);
        } else if (ctx.FALSE) {
            this.cell = new BooleanCell(false);
        }

        else if (ctx.StringLiteral) {
            const helperConst = ctx["StringLiteral"][0].image
            this.cell = new TextCell(helperConst.substring(1, helperConst.length - 1));
        } else if (ctx.Minus) {
            this.cell = new NumberCell(Number.parseFloat("-" + ctx["number"][0].children["Number"][0].image));

        } else if (ctx.number) {
            this.cell = new NumberCell(Number.parseFloat(ctx["number"][0].children["Number"][0].image));
        } else if (ctx.Datetime) {
            this.cell = new NumberCell(NumberValue.DoubleFromDateTimeTicks(ctx["Datetime"][0].image));
        }


        return this.cell;
    }
}