import { CstParser, ParserMethod, CstNode } from "chevrotain";
import { SpreadsheetLexer } from "./Lexer";

/**
 * @class
 * @desc <b> Parser class </b> The parser class follows the parsing rules laid out by the Spreadsheet.ATG file from CoreCalc
 * The rules of parsing of tokens are used subsequently to manipulate cellContents in the visitor class.
 * It parses the tokens, and returns them in a CST (Concrete Syntax tree).
 * Please note that it is not possible to manipulate the parser class, only define its rules.
 *
 * If the goal is to manipulate the CST, please use the Visitor class.
 * If you are looking for documentation, please refer to
 * [Chevrotain Parser Documention ](https://chevrotain.io/docs/tutorial/step2_parsing.html#first-rule)
 */
export class SpreadsheetParser extends CstParser {
    // @ts-ignore
    [x: string]: ParserMethod<unknown[], CstNode>;
    constructor() {
        super(SpreadsheetLexer.AllTokens);

        const $ = this;

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
        $.RULE("Numbar", NUMBER);
        $.RULE("Name", Name);

        /**
         * addOp is used to parse the arithmetic operations such as '+', '-', and '&'
         * It is part of the SpreadsheetParser function group.
         * Compared to other functions below, this only relies on the Lexer Tokens from the SpreadsheetLexer
         * @example "+" // would designate + as a addOp-type
         */
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
                    // Doesn't work?
                    ALT: (): void => {
                        $.CONSUME(SpreadsheetLexer.Ampersand);
                    },
                },
            ]);
        }

        function Name() {
            $.CONSUME(SpreadsheetLexer.Identifier);
        }

        /**
         * logicalOp is used to parse logical operators, such as '=', '<>','<' and so on.
         * It is part of  the SpreadsheetParser function group.
         * @see {addOp} for a similar method
         */
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

        /**
         * Parses and evaluates a logical expression.
         * It initially reads a logical term (string), and
         * then it combines it recursively with the logical operators
         * In the end, it returns a singular expression of type Expr
         * */
        function expression() {
            $.SUBRULE($.logicalTerm);
            $.MANY(() => {
                $.SUBRULE2($.logicalOp, { LABEL: "Operator" });
                $.SUBRULE2($.logicalTerm);
            });
        }

        /**
         * Parses and evaluates a logical term
         * Functionality very close to {@link expression}
         */
        function logicalTerm() {
            $.SUBRULE($.term);
            $.MANY(() => {
                $.SUBRULE2($.addOp);
                $.SUBRULE3($.term);
            });
        }

        function Factor() {
            console.log("Visiting Factor");
            return $.OR([
                {
                    ALT: () => {
                        console.log("Looking in application");

                        $.SUBRULE($.application);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Minus);
                        $.SUBRULE($.factor, { LABEL: "NEGATIVE" });
                    },
                },
                {
                    ALT: () => {
                        $.SUBRULE($.raref)
                        $.OPTION(() => {
                            $.CONSUME(SpreadsheetLexer.Colon);
                            $.SUBRULE2($.raref);
                        });

                        },
                },




                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.SheetRef);
                    },
                },
                {
                    ALT: () => {
                        $.SUBRULE($.Numbar);
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

        // DONE
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

            $.CONSUME(SpreadsheetLexer.LParen); // Consume '('

            $.OPTION(() => {
                $.SUBRULE($.exprs1);
            });

            $.CONSUME(SpreadsheetLexer.RParen); // Consume ')'
        }

        function Raref() {
            $.OR([
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.A1Ref);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef11);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef12);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef13);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef21);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef22);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef23);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef31);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef32);
                    },
                },
                {
                    ALT: () => {
                        const token = $.CONSUME(SpreadsheetLexer.XMLSSRARef33);
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

        /**
         * CellContents reads the input from a cell, and parses it into an expression
         * @example ="A1+B2" // Will be parsed as "=", "A1", "B1"
         */
        function cellContents() {
            $.OR([
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Equals);
                        $.SUBRULE($.expression); // Expression on the right side
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
                        $.CONSUME(SpreadsheetLexer.NUMBER);
                        $.SUBRULE($.Numbar);
                    },
                },
                {
                    ALT: () => {
                        $.CONSUME(SpreadsheetLexer.Minus);
                        $.SUBRULE2($.Numbar);
                    },
                },
            ]);
            return;
        }
        function NUMBER() {
            let t = $.CONSUME(SpreadsheetLexer.NUMBER);
        }

        $.performSelfAnalysis();
    }
}
