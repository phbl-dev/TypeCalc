import { createToken, Lexer, type TokenType } from "chevrotain"; // DONT CHANGE TO IMPORT!

/**
 * @class SpreadsheetLexer
 * @desc <B>Lexer class</b>. The purpose of this class is to store the Tokens, which are lexed during the parsing step.
 * Each of the Tokens is defined using ECMAscript regex and the class utilises the chevrotain package.
 * The all follow the same syntax, containing a name and a pattern.
 * If you are looking for documentation, please refer to
 * [Chevrotain Lexing Documention ](https://chevrotain.io/docs/tutorial/step1_lexing.html)
 */
export class SpreadsheetLexer {
    static WhiteSpace:TokenType = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });
    static Datetime:TokenType = createToken({ name: "Datetime", pattern: /\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?:\.\d+)?)?/ });

    static NUMBER: TokenType = createToken({ name: "Number", pattern: /-?\d+(\.\d+)?([eE][-+]?\d+)?/ });
    static Colon: TokenType = createToken({ name: "Colon", pattern: /:/ });
    static Identifier: TokenType = createToken({ name: "Identifier", pattern: /[A-Za-z][A-Za-z0-9_]*/ }); // aka name in ATG file.
    static StringLiteral: TokenType = createToken({ name: "StringLiteral", pattern: /"([^"\\]|\\.)*"/ });

    static QuoteCell: TokenType = createToken({ name: "QuoteCell", pattern: /'([^'\\]|\\.)*'/ , longer_alt:SpreadsheetLexer.StringLiteral});

    static Ampersand: TokenType = createToken({ name: "Ampersand", pattern: /&/ });
    static LParen: TokenType = createToken({ name: "LParen", pattern: /\(/ });
    static RParen: TokenType = createToken({ name: "RParen", pattern: /\)/ });
    static Comma: TokenType = createToken({ name: "Comma", pattern: /,/ });
    static Semicolon: TokenType = createToken({ name: "Semicolon", pattern: /;/ });
    static Plus: TokenType = createToken({ name: "Plus", pattern: /\+/ });
    static Minus: TokenType = createToken({ name: "Minus", pattern: /-/ });
    static Multiply: TokenType = createToken({ name: "Multiply", pattern: /\*/ });
    static Divide: TokenType = createToken({ name: "Divide", pattern: /\// });
    static Power: TokenType = createToken({ name: "Power", pattern: /\^/ });
    static Equals: TokenType = createToken({ name: "Equals", pattern: /=/ });
    static NotEqual: TokenType = createToken({ name: "NotEqual", pattern: /<>/ });
    static LessThanOrEqual: TokenType = createToken({ name: "LessThanOrEqual", pattern: /<=/ });
    static GreaterThanOrEqual: TokenType = createToken({ name: "GreaterThanOrEqual", pattern: />=/ });
    static LessThan: TokenType = createToken({ name: "LessThan", pattern: /</ });
    static GreaterThan: TokenType = createToken({ name: "GreaterThan", pattern: />/ });
    static SheetRef: TokenType = createToken({ name: "SheetRef", pattern: /[A-Za-z0-9_]+!/ });
    static A1Ref: TokenType = createToken({ name: "A1Ref", pattern: /\$?[A-Z]+\$?[0-9]+|\$?[A-Z]+[0-9]+/ });
    static XMLSSRARef11: TokenType = createToken({ name: "XMLSSRARef11", pattern: /RC/ }); // Match RC
    static XMLSSRARef12: TokenType = createToken({ name: "XMLSSRARef12", pattern: /RC[0-9]+/ }); // Match RC10
    static XMLSSRARef13: TokenType = createToken({ name: "XMLSSRARef13", pattern: /RC\[[+-]?[0-9]+]/ }); // Match RC[-90]
    static XMLSSRARef21: TokenType = createToken({ name: "XMLSSRARef21", pattern: /R\[[0-9]+]C/ }); // Match R[90]C
    static XMLSSRARef22: TokenType = createToken({ name: "XMLSSRARef22", pattern: /R\[[0-9]+]C\[[0-9]+]/ }); // Match R[90]C[90]
    static XMLSSRARef23: TokenType = createToken({ name: "XMLSSRARef23", pattern: /R[0-9]+C\[[+-]?[0-9]+]/ }); // Match R10C[90]
    static XMLSSRARef31: TokenType = createToken({ name: "XMLSSRARef31", pattern: /R\[[+-]?[0-9]+]C/ }); // Match R[+9]C
    static XMLSSRARef32: TokenType = createToken({ name: "XMLSSRARef32", pattern: /R\[[+-]?[0-9]+]C\[[0-9]+]/ }); // Match R[+9]C[9]
    static XMLSSRARef33: TokenType = createToken({ name: "XMLSSRARef33", pattern: /R\[[+-]?[0-9]+]C\[[+-]?[0-9]+]/ }); // Match R[-0000]C[-10]

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
        SpreadsheetLexer.Identifier,

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
