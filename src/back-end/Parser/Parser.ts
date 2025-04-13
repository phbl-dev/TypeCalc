import { CstParser, type ParserMethod, type CstNode } from "chevrotain";
import { SpreadsheetLexer } from "./Lexer";

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
        $.RULE("Name", Name);

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

        function Name() {
            $.CONSUME(SpreadsheetLexer.Identifier);
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
            ]);
            return;
        }
        function NUMBER() {
            $.CONSUME(SpreadsheetLexer.NUMBER);
        }

        $.performSelfAnalysis();
    }
}