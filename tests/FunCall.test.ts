import {beforeEach, describe, expect, should, test} from "vitest";
import * as formulajs from '@formulajs/formulajs'
import {CellRef, Expr, ExprArray, FunCall, NumberConst, TextConst} from "../src/back-end/Expressions";
import { Sheet } from "../src/back-end/Sheet";
import { Workbook } from "../src/back-end/Workbook";
import {SuperRARef} from "../src/back-end/CellAddressing";
import { BlankCell, Cell, Formula, NumberCell } from "../src/back-end/Cells";
import {CyclicException} from "../src/back-end/Types";

import {ErrorValue, NumberValue, TextValue} from "../src/back-end/Value"; // Importing formulajs


describe("Formula.js", () => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", 0, 0, false)
    });

    test("Make method", () => {
        let expr1: Expr = new NumberConst(1);
        let expr2: Expr = new NumberConst(2);

        let maker = FunCall.Make("SUM", [expr1, expr2])

        expect(maker instanceof Expr).toBe(true)
    });

    test("Make method with NEG", () => {
        let expr1: Expr = new NumberConst(1);
        let expr2: Expr = new NumberConst(20);
        let expr3: Expr = new NumberConst(-20);

        let maker = FunCall.Make("NEG", [expr1])
        let maker2 = FunCall.Make("NEG", [expr2])
        let maker3 = FunCall.Make("NEG", [expr3])

        expect(NumberValue.ToNumber(maker.Eval(sheet, 0,0))).toBe(-1)
        expect(NumberValue.ToNumber(maker2.Eval(sheet, 0,0))).toBe(-20)
        expect(NumberValue.ToNumber(maker3.Eval(sheet, 0,0))).toBe(20)
    });

    // ======== [ MATH TESTS ] ========
    test("Getter method with SUM", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("SUM");
        expect(func(1,2)).toBe(3);
    });

    test("Getter method with POWER", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("POWER");
        expect(func(2,3)).toBe(8);
    });

    test("Eval with SUM", () => {
        let expr1: Expr = new NumberConst(1);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(2);
        let expr4: Expr = new NumberConst(3);
        let expr5: Expr = new NumberConst(1);

        let funCall: Expr = FunCall.Make("SUM", [expr1, expr2, expr3, expr4, expr5]);
        let funCall2: Expr = FunCall.Make("SUM", [expr1, expr2, expr3, expr4, expr5, funCall]);
        let funCall3: Expr = FunCall.Make("SUM", [expr1, expr2, expr3, expr4, expr5, ExprArray.MakeExprArray([expr1, expr2])]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(9);
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe(18);
        expect(NumberValue.ToNumber(funCall3.Eval(sheet,0,0))).toBe(12);

    });

    test("Eval with PRODUCT", () => {
        let expr1: Expr = new NumberConst(3);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(2);

        let funCall: Expr = FunCall.Make("PRODUCT", [expr1, expr2, expr3]);
        let funCall2: Expr = FunCall.Make("PRODUCT", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(12); // Works with multiple arguments
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe(3); // Works with a single argument
    });

    test("Eval with POWER", () => {
        let expr1: Expr = new NumberConst(3);
        let expr2: Expr = new NumberConst(2);

        // Setting a number cell to be 10 and creating a reference for it:
        const cellRef1 = new CellRef(sheet, new SuperRARef(true, 0, true, 5));
        const cell1 = new NumberCell(3)
        sheet.SetCell(cell1, 0, 5)

        // Setting a number cell to be 5 and creating a reference for it:
        const cellRef2 = new CellRef(sheet, new SuperRARef(true, 0, true, 6));
        const cell2 = new NumberCell(2)
        sheet.SetCell(cell2, 0, 6)

        // Formula cell
        const funCall4 = FunCall.Make("POWER", [cellRef1, cellRef2]);
        const cell4 = Formula.Make(workbook, funCall4)
        sheet.SetCell(cell4, 1, 6)
        workbook.Recalculate();

        let funCall: Expr = FunCall.Make("POWER", [expr1, expr2]);
        let funCall2: Expr = FunCall.Make("POWER", [cellRef1, cellRef2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(9);  // Works with expressions
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe(9); // Works with cell references that are linked to number cells
        expect(sheet.Get(1,6).Eval(sheet,0,0).ToObject()).toBe(9);
    });

    test("Eval with ABS", () => {
        let expr1: Expr = new NumberConst(-4);
        let funCall: Expr = FunCall.Make("ABS", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(4);
    });

    test("Eval with ACOS", () => {
        let expr1: Expr = new NumberConst(-0.5);
        let funCall: Expr = FunCall.Make("ACOS", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(2.0943951023931957);
    });

    test("Eval with ACOSH", () => {
        let expr1: Expr = new NumberConst(10);
        let funCall: Expr = FunCall.Make("ACOSH", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(2.993222846126381);
    });

    test("Eval with ACOT", () => {
        let expr1: Expr = new NumberConst(2);
        let funCall: Expr = FunCall.Make("ACOT", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(0.4636476090008061);
    });

    test("Eval with ACOTH", () => {
        let expr1: Expr = new NumberConst(6);
        let funCall: Expr = FunCall.Make("ACOTH", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(0.16823611831060642);
    });

    test("Eval with AGGREGATE", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("AGGREGATE");
        expect(func(9, 4, [-5,15], [32,'Hello World!'])).toBe(10); // should be 10, 32 according to formulajs
        expect(formulajs.AGGREGATE(9, 4, [-5,15], [32,'Hello World!'])).toBe(10)

        let expr1: Expr = new NumberConst(9);
        let expr2: Expr = new NumberConst(4);
        let expr3: Expr = new NumberConst(-5);
        let expr4: Expr = new NumberConst(15);
        let expr5: Expr = new NumberConst(32);
        let expr6: Expr = new TextConst("Hello World!");

        let funCall: Expr = FunCall.Make("AGGREGATE", [expr1, expr2, ExprArray.MakeExprArray([expr3, expr4]), ExprArray.MakeExprArray([expr5, expr6])]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(10);
    });

    test("Eval with ARABIC", () => {
        let expr1: Expr = new TextConst("MCMXII");
        let funCall: Expr = FunCall.Make("ARABIC", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(1912);
    });

    test("Eval with ASIN", () => {
        let expr1: Expr = new NumberConst(-0.5);
        let funCall: Expr = FunCall.Make("ASIN", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-0.5235987755982989);
    });

    test("Eval with ASINH", () => {
        let expr1: Expr = new NumberConst(-2.5);
        let funCall: Expr = FunCall.Make("ASINH", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-1.6472311463710965);
    });

    test("Eval with ATAN", () => {
        let expr1: Expr = new NumberConst(1);
        let funCall: Expr = FunCall.Make("ATAN", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(0.7853981633974483);
    });

    test("Eval with ATAN2", () => {
        let expr1: Expr = new NumberConst(-1);
        let expr2: Expr = new NumberConst(-1);

        let funCall: Expr = FunCall.Make("ATAN2", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-2.356194490192345);
    });

    test("Eval with ATANH", () => {
        let expr1: Expr = new NumberConst(-0.1);
        let funCall: Expr = FunCall.Make("ATANH", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-0.10033534773107562);
    });

    test("Eval with BASE", () => {
        let expr1: Expr = new NumberConst(15);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(10);


        let funCall: Expr = FunCall.Make("BASE", [expr1, expr2, expr3]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("0000001111");
    });


    test("Eval with CEILING", () => {
        let expr1: Expr = new NumberConst(-5.5);
        let expr2: Expr = new NumberConst(2);
        let funCall: Expr = FunCall.Make("CEILING", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-4);
    });

    test("Eval with CEILINGMATH", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("CEILINGMATH");
        expect(func(-5.5,2,-1)).toBe(-6);
        expect(formulajs.CEILINGMATH(-5.5,2,-1)).toBe(-6)

        let expr1: Expr = new NumberConst(-5.5);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(-1);
        let funCall: Expr = FunCall.Make("CEILINGMATH", [expr1, expr2, expr3]);

        // Doesn't work because the current implementation of Eval() calls the function with two
        // of the expressions at a time and CEILINGMATH must have all three arguments at the same time to work:
        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-6);
    });

    test("Eval with CEILINGPRECISE", () => {
        let expr1: Expr = new NumberConst(-5.5);
        let expr2: Expr = new NumberConst(2);
        let funCall: Expr = FunCall.Make("CEILINGPRECISE", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-4);
    });

    test("Eval with COMBIN", () => {
        let expr1: Expr = new NumberConst(8);
        let expr2: Expr = new NumberConst(2);
        let funCall: Expr = FunCall.Make("COMBIN", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(28);
    });

    test("Eval with COMBINA", () => {
        let expr1: Expr = new NumberConst(4);
        let expr2: Expr = new NumberConst(3);
        let funCall: Expr = FunCall.Make("COMBINA", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(20);
    });

    test("Eval with COS", () => {
        let expr1: Expr = new NumberConst(1);
        let funCall: Expr = FunCall.Make("COS", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(0.5403023058681398);
    });

    test("Eval with COSH", () => {
        let expr1: Expr = new NumberConst(1);
        let funCall: Expr = FunCall.Make("COSH", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(1.5430806348152437);
    });

    test("Eval with ISEVEN", () => {
        let expr1: Expr = new NumberConst(2);
        let expr2: Expr = new NumberConst(2.5);

        let funCall: Expr = FunCall.Make("ISEVEN", [expr1]);
        let funCall2: Expr = FunCall.Make("ISEVEN", [expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("true");
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe("true");
    });

    test("Eval with FACT", () => {
        let expr1: Expr = new NumberConst(5);
        let funCall: Expr = FunCall.Make("FACT", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(120);
    });

    test("Eval with FLOOR", () => {
        console.log(formulajs.FLOOR(3.1, 1))
        let expr1: Expr = new NumberConst(3.1);
        let expr2: Expr = new NumberConst(1);
        let funCall: Expr = FunCall.Make("FLOOR", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(3);
    });


    // ======== [ DATE TESTS ] ========
    test("Eval with DATE", () => {
        let expr1: Expr = new NumberConst(2008);
        let expr2: Expr = new NumberConst(7);
        let expr3: Expr = new NumberConst(8);

        let funCall: Expr = FunCall.Make("DATE", [expr1, expr2, expr3]);
        let array: string[] = []
        let str: string | null | undefined = TextValue.ToString(funCall.Eval(sheet,0,0));

        if (str !== null && str !== undefined) {
            array = str.split(" ");
        }
        expect(array[0]).toBe("Tue")
        expect(array[1]).toBe("Jul")
        expect(array[2]).toBe("08")
        expect(array[3]).toBe("2008")
    })

    test("Eval with DATEVALUE", () => {
        let expr1: Expr = new TextConst('7/8/2008');

        let funCall: Expr = FunCall.Make("DATEVALUE", [expr1]);
        let array: string[] = []
        let str: string | null | undefined = TextValue.ToString(funCall.Eval(sheet,0,0));

        if (str !== null && str !== undefined) {
            array = str.split(" ");
        }
        expect(array[0]).toBe("Tue")
        expect(array[1]).toBe("Jul")
        expect(array[2]).toBe("08")
        expect(array[3]).toBe("2008")
    })

    test("Eval with DAY", () => {
        let expr1: Expr = new TextConst('15-Apr-11');

        let funCall: Expr = FunCall.Make("DAY", [expr1]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe(15);
    })

    test("Eval with DAYS", () => {
        let expr1: Expr = new TextConst('3/15/11');
        let expr2: Expr = new TextConst('2/1/11');

        let funCall: Expr = FunCall.Make("DAYS", [expr1, expr2]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe(42);
    })

    test("Eval with DAYS360", () => {
        let expr1: Expr = new TextConst('1-Jan-11');
        let expr2: Expr = new TextConst('31-Dec-11');

        let funCall: Expr = FunCall.Make("DAYS360", [expr1, expr2]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe(360);
    })

    test("Eval with EDATE", () => {
        let expr1: Expr = new TextConst('1/15/11');
        let expr2: Expr = new NumberConst(-1);

        let funCall: Expr = FunCall.Make("EDATE", [expr1, expr2]);
        let array: string[] = []
        let str: string | null | undefined = TextValue.ToString(funCall.Eval(sheet,0,0));

        if (str !== null && str !== undefined) {
            array = str.split(" ");
        }
        expect(array[0]).toBe("Wed")
        expect(array[1]).toBe("Dec")
        expect(array[2]).toBe("15")
        expect(array[3]).toBe("2010")
    })

    test("Eval with EOMONTH", () => {
        let expr1: Expr = new TextConst('1/1/11');
        let expr2: Expr = new NumberConst(-3);

        let funCall: Expr = FunCall.Make("EOMONTH", [expr1, expr2]);
        let array: string[] = []
        let str: string | null | undefined = TextValue.ToString(funCall.Eval(sheet,0,0));

        if (str !== null && str !== undefined) {
            array = str.split(" ");
        }
        expect(array[0]).toBe("Sun")
        expect(array[1]).toBe("Oct")
        expect(array[2]).toBe("31")
        expect(array[3]).toBe("2010")
    })


    // ======== [ TEXT TESTS ] ========
    test("Eval with CHAR", () => {
        let expr1: Expr = new NumberConst(65);
        let expr2: Expr = new NumberConst(89);

        let funCall: Expr = FunCall.Make("CHAR", [expr1]);
        let funCall2: Expr = FunCall.Make("CHAR", [expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("A");
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe("Y");
    });

    test("Eval with CODE", () => {
        let expr1: Expr = new TextConst("A");
        let expr2: Expr = new TextConst("Y");

        let funCall: Expr = FunCall.Make("CODE", [expr1]);
        let funCall2: Expr = FunCall.Make("CODE", [expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(65);
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe(89);
    });

    test("Eval with CONCATENATE", () => {
        let expr1: Expr = new TextConst("Hello");
        let expr2: Expr = new TextConst(" ");
        let expr3: Expr = new TextConst("World!");

        let funCall: Expr = FunCall.Make("CONCATENATE", [expr1, expr2, expr3]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("Hello World!");
    });

    test("Eval with TEXTJOIN", () => {
        let expr1: Expr = new TextConst("Hello");
        let expr2: Expr = new TextConst(" ");
        let expr3: Expr = new TextConst("World!");
        let expr4: Expr = new TextConst("true");

        let funCall: Expr = FunCall.Make("TEXTJOIN", [expr2, expr4, expr1, expr3]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("Hello World!");
    });

    test("Eval with EXACT", () => {
        let expr1: Expr = new TextConst("Test");
        let expr2: Expr = new TextConst("test");
        let expr3: Expr = new TextConst("Test");

        let funCall: Expr = FunCall.Make("EXACT", [expr1, expr2]);
        let funCall2: Expr = FunCall.Make("EXACT", [expr1, expr3]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("false");
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe("true");
    });

    test("Eval with FIND", () => {
        let expr1: Expr = new TextConst("I");
        let expr2: Expr = new TextConst("Welcome to ITU");
        let expr3: Expr = new NumberConst(5);

        // Finds the position of "I" in "Welcome to ITU" at word "ITU"
        let funCall: Expr = FunCall.Make("FIND", [expr1, expr2, expr3]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(12);
    });

    test("Eval with LEN", () => {
        let expr1: Expr = new TextConst("Welcome to ITU");

        let funCall: Expr = FunCall.Make("LEN", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(14);
    });

    test("Eval with UPPER", () => {
        let expr1: Expr = new TextConst("Welcome to ITU");

        let funCall: Expr = FunCall.Make("UPPER", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("WELCOME TO ITU");
    });

    test("Eval with LOWER", () => {
        let expr1: Expr = new TextConst("Welcome to ITU");

        let funCall: Expr = FunCall.Make("LOWER", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("welcome to itu");
    });

    test("Eval with PROPER", () => {
        let expr1: Expr = new TextConst("Welcome to ITU");

        let funCall: Expr = FunCall.Make("PROPER", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("Welcome To Itu");
    });

    test("Eval with ROMAN", () => {
        let expr1: Expr = new NumberConst(100);
        let expr2: Expr = new NumberConst(499);

        let funCall: Expr = FunCall.Make("ROMAN", [expr1]);
        let funCall2: Expr = FunCall.Make("ROMAN", [expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe("C");
        expect(NumberValue.ToNumber(funCall2.Eval(sheet,0,0))).toBe("CDXCIX");
    });


    // ======== [ LOGICAL TESTS ] ========
    test("Eval with AND", () => {
        console.log(formulajs.AND(false, true))
        let expr1: Expr = new NumberConst(0); // We don't have a BooleanConst, but we can make boolean NumberConst
        let expr2: Expr = new NumberConst(1);

        let funCall: Expr = FunCall.Make("AND", [expr1, expr2]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("false");
    });

    test("Eval with IF", () => {
        const expr1: Expr = new NumberConst(1); // We don't have a BooleanConst, but we can make boolean NumberConst
        const expr2: Expr = new TextConst("Hello");
        const expr3: Expr = new TextConst("Goodbye");
        const expr4: Expr = new NumberConst(0); // We don't have a BooleanConst, but we can make boolean NumberConst
        const expr5: Expr = new TextConst("Hello");
        const expr6: Expr = new TextConst("true");
        const expr7: Expr = new TextConst("false");




        const funCall: Expr = FunCall.Make("IF", [expr1, expr2, expr3]);
        const funCall2: Expr = FunCall.Make("IF", [expr4, expr2, expr3]);
        const funCall3: Expr = FunCall.Make("IF", [FunCall.Make("EQUALS", [expr2, expr5]), expr6, expr7]);


        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("Hello");
        expect(TextValue.ToString(funCall2.Eval(sheet,0,0))).toBe("Goodbye");
        expect(TextValue.ToString(funCall3.Eval(sheet,0,0))).toBe("true");



        // expect(NumberValue.ToNumber(sheet.Get(0,0).Eval(sheet,0,0))).toBe(42);



    });


    // Testing that a cyclic is NOT detected in certain IF() situations (where it's not required).
    test("Eval with IF2", () => {
        const trueExpr: Expr = new NumberConst(1); // We don't have a BooleanConst, but we can make boolean NumberConst
        const falseExpr: Expr = new NumberConst(0); // We don't have a BooleanConst, but we can make boolean NumberConst
        const expr3: Expr = new NumberConst(42); // Some default value

        // If we divide 1/0 we get an error value as we should:
        const shouldBreak = FunCall.Make("DIVIDE", [trueExpr, falseExpr])
        expect(shouldBreak.Eval(sheet,0,0).ToObject()).toBeInstanceOf(ErrorValue);

        // But if it is wrapped inside an IF statement then we don't want to evaluate 1/0 if we don't need to.
        // So we should correctly skip the ErrorValue:
        const funCall5: Expr = FunCall.Make("IF", [falseExpr, shouldBreak, expr3])
        const cell1 = Formula.Make(workbook, funCall5)
        sheet.SetCell(cell1, 0, 0);
        workbook.Recalculate();

        // IF(FALSE, 1/0, 42) should be evaluated to 42, and not ErrorValue:
        expect(sheet.Get(0,0).Eval(sheet,0,0).ToObject()).toBe(42);

        // If cell A1 holds the formula =IF(FALSE, A1, 42) then there should not be
        // detected a cycle because the reference to A1 in the formula should not
        // even be evaluated.
        const cellRef3 = new CellRef(sheet, new SuperRARef(false, 0, false, 0));
        const funCall6 = FunCall.Make("IF", [falseExpr, cellRef3, expr3])
        const cell3 = Formula.Make(workbook, funCall6);
        sheet.SetCell(cell3, 1, 0) // Creating a cyclic dependency on purpose to check that it won't cause problems for IF in this scenario.
        workbook.Recalculate();

        expect(sheet.Get(1,0).Eval(sheet,1,0).ToObject()).toBe(42);

        // NOTE: right now there may not be a cyclic dependency because it isn't tracked right:
        const funCall7 = FunCall.Make("IF", [trueExpr, cellRef3, expr3])
        const cell4 = Formula.Make(workbook, funCall7);
        sheet.SetCell(cell4, 1, 0) // Creating a cyclic dependency on purpose to check that it won't cause problems for IF in this scenario.

        console.log(sheet.Get(1,0).Eval(sheet,1,0))
        workbook.Recalculate();


        const finalResult = sheet.Get(1,0).Eval(sheet,1,0);
        expect(finalResult).toBeInstanceOf(ErrorValue);  // Expect ErrorValue instead of exception
        expect((finalResult.ToObject() as ErrorValue).message).toBe("#CYCLE!");

        //expect(sheet.Get(1,0).Eval(sheet,1,0)).toThrow("CyclicException: ### CYCLE in cell TestSheet!B1 formula =func(1, TestSheet!C1, 42) \n")
        //console.log(sheet.Get(1,0).Eval(sheet,0,0))
        // When we insert "true" as the first expressions the second expression
        // should be evaluated and then a cyclic dependency should be detected.
        // But it just gives 0.
    })


    test("Eval with EQUALS", () => {
        // Setting a number cell to be 10 and creating a reference for it:
        const cellRef1 = new CellRef(sheet, new SuperRARef(false, 1, false, 1));
        const cell1 = new NumberCell(10)
        sheet.SetCell(cell1, 1, 1)

        // Setting a number cell to be 5 and creating a reference for it:
        const cellRef2 = new CellRef(sheet, new SuperRARef(false, 2, false, 2));
        const cell2 = new NumberCell(5)
        sheet.SetCell(cell2, 2, 2)

        // Setting a number cell to be 10 and creating a reference for it:
        const cellRef3 = new CellRef(sheet, new SuperRARef(false, 3, false, 3));
        const cell3 = new NumberCell(10)
        sheet.SetCell(cell3, 3, 3)

        const funCall: Expr = FunCall.Make("EQUALS", [cellRef1, cellRef2])
        const funCall2: Expr = FunCall.Make("EQUALS", [cellRef1, cellRef3])

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("false");
        expect(TextValue.ToString(funCall2.Eval(sheet,0,0))).toBe("true");
    })


    test("Eval with CHOOSE", () => {
        sheet.SetCell(Cell.Parse("=10", workbook, 0,0),1,0) // B1
        sheet.SetCell(Cell.Parse("=10", workbook, 0,0),0,0) // A1

        // Creating A1 Cycle!
        sheet.SetCell(Cell.Parse("=SUM(CHOOSE(2, A1:A10, B1:B10, C1:C10))", workbook, 0,0),0,0)

        workbook.Recalculate();

        // Cycle is not a problem because CHOOSE is non-strict so it doesn't evaluate "A1:A10" because it only
        // needs to evaluate "B1:B10":
        expect(sheet.Get(0,0).Eval(sheet,0,0).ToObject()).toBe(10)

        // Change argument to be 1:
        sheet.SetCell(Cell.Parse("=SUM(CHOOSE(1, A1:A10, B1:B10, C1:C10))", workbook, 0,0),0,0)

        workbook.Recalculate();

        const result = sheet.Get(0,0).Eval(sheet,0,0);

        expect(result).toBeInstanceOf(ErrorValue);
        expect((result.ToObject() as ErrorValue).message).toBe("#CYCLE!");
        // Correctly throws cyclic exception because now the Cell Area A1:A10 is chosen, and it has a cycle:
        //expect(() => sheet.Get(0,0).Eval(sheet,0,0)).toThrowError(CyclicException);
    })

});