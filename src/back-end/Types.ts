import type {FullCellAddress} from "./CellAddressing";
import {CstNode, ICstVisitor, IToken} from "chevrotain";


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

/**
 * Interface representing a Concrete Syntax Tree (CST) node visitor.
 * This interface is used to traverse and process various nodes within
 * a CST by implementing methods corresponding to each type of node.
 *
 * @template IN - The input type passed to the visitor methods.
 * @template OUT - The output type returned by the visitor methods.
 */
export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
    addOp(children: AddOpCstChildren, param?: IN): OUT;
    logicalOp(children: LogicalOpCstChildren, param?: IN): OUT;
    expression(children: ExpressionCstChildren, param?: IN): OUT;
    logicalTerm(children: LogicalTermCstChildren, param?: IN): OUT;
    factor(children: FactorCstChildren, param?: IN): OUT;
    term(children: TermCstChildren, param?: IN): OUT;
    mulOp(children: MulOpCstChildren, param?: IN): OUT;
    powFactor(children: PowFactorCstChildren, param?: IN): OUT;
    application(children: ApplicationCstChildren, param?: IN): OUT;
    raref(children: RarefCstChildren, param?: IN): OUT;
    exprs1(children: Exprs1CstChildren, param?: IN): OUT;
    cellContents(children: CellContentsCstChildren, param?: IN): OUT;
    number(children: NumberCstChildren, param?: IN): OUT;
}


export interface AddOpCstNode extends CstNode {
    name: "addOp";
    children: AddOpCstChildren;
}

export type AddOpCstChildren = {
    Plus?: IToken[];
    Minus?: IToken[];
    Ampersand?: IToken[];
};

export interface LogicalOpCstNode extends CstNode {
    name: "logicalOp";
    children: LogicalOpCstChildren;
}

export type LogicalOpCstChildren = {
    Equals?: IToken[];
    NotEqual?: IToken[];
    LessThan?: IToken[];
    GreaterThan?: IToken[];
    LessThanOrEqual?: IToken[];
    GreaterThanOrEqual?: IToken[];
};

export interface ExpressionCstNode extends CstNode {
    name: "expression";
    children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
    logicalTerm: (LogicalTermCstNode)[];
    Operator?: LogicalOpCstNode[];
};

export interface LogicalTermCstNode extends CstNode {
    name: "logicalTerm";
    children: LogicalTermCstChildren;
}

export type LogicalTermCstChildren = {
    term: (TermCstNode)[];
    addOp?: AddOpCstNode[];
};

export interface FactorCstNode extends CstNode {
    name: "factor";
    children: FactorCstChildren;
}

export type FactorCstChildren = {
    application?: ApplicationCstNode[];
    Minus?: IToken[];
    NEGATIVE?: NumberCstNode[];
    SheetRef?: IToken[];
    raref?: (RarefCstNode)[];
    Colon?: IToken[];
    LBracket?: IToken[];
    ArrayElement?: (ExpressionCstNode)[];
    Comma?: IToken[];
    RBracket?: IToken[];
    number?: NumberCstNode[];
    TRUE?: IToken[];
    FALSE?: IToken[];
    StringLiteral?: IToken[];
    LParen?: IToken[];
    expression?: ExpressionCstNode[];
    RParen?: IToken[];
};

export interface TermCstNode extends CstNode {
    name: "term";
    children: TermCstChildren;
}

export type TermCstChildren = {
    powFactor: (PowFactorCstNode)[];
    mulOp?: MulOpCstNode[];
};

export interface MulOpCstNode extends CstNode {
    name: "mulOp";
    children: MulOpCstChildren;
}

export type MulOpCstChildren = {
    Multiply?: IToken[];
    Divide?: IToken[];
};

export interface PowFactorCstNode extends CstNode {
    name: "powFactor";
    children: PowFactorCstChildren;
}

export type PowFactorCstChildren = {
    factor: (FactorCstNode)[];
    Power?: IToken[];
};

export interface ApplicationCstNode extends CstNode {
    name: "application";
    children: ApplicationCstChildren;
}

export type ApplicationCstChildren = {
    Identifier: IToken[];
    LParen: IToken[];
    exprs1?: Exprs1CstNode[];
    RParen: IToken[];
};

export interface RarefCstNode extends CstNode {
    name: "raref";
    children: RarefCstChildren;
}

export type RarefCstChildren = {
    A1Ref?: IToken[];
    XMLSSRARef11?: IToken[];
    XMLSSRARef12?: IToken[];
    XMLSSRARef13?: IToken[];
    XMLSSRARef21?: IToken[];
    XMLSSRARef22?: IToken[];
    XMLSSRARef23?: IToken[];
    XMLSSRARef31?: IToken[];
    XMLSSRARef32?: IToken[];
    XMLSSRARef33?: IToken[];
};

export interface Exprs1CstNode extends CstNode {
    name: "exprs1";
    children: Exprs1CstChildren;
}

export type Exprs1CstChildren = {
    expression: (ExpressionCstNode)[];
    Comma?: IToken[];
    Semicolon?: IToken[];
};
export type CellContentsCstChildren = {
    Equals?: IToken[];
    expression?: ExpressionCstNode[];
    QuoteCell?: IToken[];
    Datetime?: IToken[];
    StringLiteral?: IToken[];
    number?: (NumberCstNode)[];
    Minus?: IToken[];
    TRUE?: IToken[];
    FALSE?: IToken[];
};

export interface NumberCstNode extends CstNode {
    name: "number";
    children: NumberCstChildren;
}

export type NumberCstChildren = {
    Number: IToken[];
};