import { describe, expect, test } from "vitest";
import {ErrorValue, NumberValue, Value} from "../src/back-end/Values";

describe("NumberValue can be Instantiated properly", () => {
  test("NumberValue can be instantiated from a number", () => {
    const nv = NumberValue.Make(10);
    expect(nv).toBeDefined();
  });

  test("NumberValue cannot be instantiated from Infinity", () => {
    const nv = NumberValue.Make(Infinity);
    expect(typeof nv).toEqual(typeof ErrorValue.numError);
  });

  test("Two instances with same values are equal", () => {
    const nv1 = NumberValue.Make(10);
    const nv2 = NumberValue.Make(10);

    expect(nv1.Equals(nv2)).toBeTruthy();
  });

  test("Two instances with same type, but not same values should not be equal", () => {
    const nv1 = NumberValue.Make(10);
    const nv2 = NumberValue.Make(11);

    expect(nv1.Equals(nv2)).toBeFalsy();
  });


  test("ToObject should return the inner value as Values tupe", () => {
    const nv1 = NumberValue.Make(10);
    expect(nv1.ToObject()).toBe(10);
  });

  test("Conversion from Double value to Object", () => {
    const nv1 = NumberValue.Make(3.14);
    expect(NumberValue.ToNumber(nv1)).toBe(3.14);
  });

  test("Conversion from Double value to Object two", () => {
    const nv1 = NumberValue.Make(10);
    expect(NumberValue.ToNumber(nv1)).toBe(10.0);
    // Shows that a number can be a float or integer
  });

  test("Conversion from Object to Double value", () => {
    const nv1 = NumberValue.FromNumber(new Number(300));
    if (nv1 != null) {
      expect(nv1.ToObject()).eq(NumberValue.Make(300).ToObject());
    }
    return;
  });

  test("Invalid: Two objects with different values should not be equal", () => {
    const nv1 = NumberValue.FromNumber(new Number(300));
    if (nv1 != null) {
      expect(NumberValue.ONE.ToObject()).not.eq(nv1.ToObject());
    }
  });

  test("LargeNumber", () => {
    const numberValue = NumberValue.FromNumber(new Number(400000000000000000));
    const result = numberValue!.ToObject();
    expect(result).toBe(400000000000000000);
  });

  test("LargeNumber Negative", () => {
    const numberValue = NumberValue.FromNumber(new Number(-400000000000000000));
    const result = numberValue!.ToObject();
    expect(result).toBe(-400000000000000000);
  });

  test("Boolean Conversion from Object (true)", () => {
    expect(NumberValue.FromBoolean(new Boolean(true))).toEqual(NumberValue.ONE);
  });

  test("Boolean Conversion from Object (false)", () => {
    expect(NumberValue.FromBoolean(new Boolean(false))).toEqual(
      NumberValue.ZERO,
    );
  });


  test("Boolean Conversion to Values Object(true)", () => {
    const nvBool: Value = NumberValue.FromBoolean(new Boolean(true))!;
    expect(NumberValue.ToBoolean(nvBool)!.valueOf()).toBeTruthy();
  });

  test("Boolean Conversion to Values Object(false)", () => {
    const nvBool: Value = NumberValue.FromBoolean(new Boolean(false))!;
    expect(NumberValue.ToBoolean(nvBool)!.valueOf()).toBeFalsy();
  });
});
