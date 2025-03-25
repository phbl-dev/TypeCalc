import { describe, expect, test } from "vitest";
import { ObjectValue } from "../back-end/ObjectValue";

describe("ObjectValue", () => {
  const obj = new ObjectValue({ object: "test" });
  const objNull = new ObjectValue(null);

  test("Make can handle null values", () => {
    expect(ObjectValue.Make(null)).toBe(ObjectValue.nullObjectValue);
  });

  test("Make can handle object values", () => {
    expect(ObjectValue.Make({ object: "test" })).toEqual(obj);
  });

  test("ToString can return objects as string", () => {
    expect(obj.ToString()).toEqual('{"object":"test"}');
  });

  test("ToObject can handle null values", () => {
    expect(typeof objNull.ToObject()).toEqual("object");
  });

  test("ToObject can handle object values", () => {
    expect(typeof obj.ToObject()).toEqual("object");
  });
});
