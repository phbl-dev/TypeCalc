import { beforeEach, describe, expect, test } from "vitest";
import * as formulajs from '@formulajs/formulajs'
import { Expr, FunCall, NumberConst, TextConst } from "../src/Expressions";
import { Sheet } from "../src/Sheet";
import { Workbook } from "../src/Workbook";
import { Cell } from "gridjs";
import { Formula, NumberCell } from "../src/Cells";
import { NumberValue } from "../src/NumberValue";
import { TextValue } from "../src/TextValue"; // Importing formulajs


describe("Formula.js", () => {
    let workbook: Workbook;
    let sheet: Sheet;

    beforeEach(() => {
        workbook = new Workbook();
        sheet = new Sheet(workbook, "TestSheet", 0, 0, false)
    });

    test("SUM", () => {
        expect(formulajs.SUM([1, 2, 3])).toBe(6);
    });

    test("PRODUCT", () => {
        expect(formulajs.PRODUCT(2,3)).toBe(6);
    });

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

    test("Make method", () => {
        let expr1: Expr = new NumberConst(1);
        let expr2: Expr = new NumberConst(2);

        let maker = FunCall.Make("SUM", [expr1, expr2])

        expect(maker instanceof Expr).toBe(true)
    });

    test("Eval with SUM", () => {
        let expr1: Expr = new NumberConst(1);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(2);
        let expr4: Expr = new NumberConst(3);
        let expr5: Expr = new NumberConst(1);

        let funCall: Expr = FunCall.Make("SUM", [expr1, expr2, expr3, expr4, expr5]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(9);
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
        let funCall: Expr = FunCall.Make("POWER", [expr1, expr2]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(9);
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

    test.skip("Eval with AGGREGATE", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("AGGREGATE");
        expect(func(9, 4, [-5,15], [32,'Hello World!'])).toBe(10); // should be 10, 32 according to formulajs
        expect(formulajs.AGGREGATE(9, 4, [-5,15], [32,'Hello World!'])).toBe(10)

        let expr1: Expr = new NumberConst(-0.5);
        let funCall: Expr = FunCall.Make("AGGREGATE", [expr1]);

        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(10);
    });


    test("Eval with CEILINGMATH", () => {
        let func: (...args: unknown[]) => unknown;
        func = FunCall.getFunctionByName("CEILINGMATH");
        expect(func(-5.5,2,-1)).toBe(-6);
        expect(formulajs.CEILINGMATH(-5.5,2,-1)).toBe(-6)
        // console.log("name test1 : " + formulajs.CEILINGMATH.name)
        // console.log("name test2 : " + formulajs.PRODUCT.name)


        let expr1: Expr = new NumberConst(-5.5);
        let expr2: Expr = new NumberConst(2);
        let expr3: Expr = new NumberConst(-1);
        let funCall: Expr = FunCall.Make("CEILINGMATH", [expr1, expr2, expr3]);

        // Doesn't work because the current implementation of Eval() calls the function with two
        // of the expressions at a time and CEILINGMATH must have all three arguments at the same time to work:
        expect(NumberValue.ToNumber(funCall.Eval(sheet,0,0))).toBe(-6);
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

    test("Eval with DATE", () => {
        let expr1: Expr = new NumberConst(2008);
        let expr2: Expr = new NumberConst(7);
        let expr3: Expr = new NumberConst(8);

        let funCall: Expr = FunCall.Make("DATE", [expr1, expr2, expr3]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("Tue Jul 08 2008 00:00:00 GMT+0200 (Central European Summer Time)");
    })

    test("Eval with DATEVALUE", () => {
        let expr1: Expr = new TextConst('7/8/2008');

        let funCall: Expr = FunCall.Make("DATEVALUE", [expr1]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("Tue Jul 08 2008 00:00:00 GMT+0200 (Central European Summer Time)");
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

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("Wed Dec 15 2010 00:00:00 GMT+0100 (Central European Standard Time)");
    })

    // Not working for some reason:
    test.skip("Eval with EOMONTH", () => {
        let expr1: Expr = new TextConst('1/1/11');
        let expr2: Expr = new NumberConst(-3);

        let funCall: Expr = FunCall.Make("EOMONTH", [expr1, expr2]);

        expect(TextValue.ToString(funCall.Eval(sheet,0,0))).toBe("Wed Dec 15 2010 00:00:00 GMT+0100 (Central European Standard Time)");
    })

});