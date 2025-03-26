import { describe, expect, test } from "vitest";
import { Adjusted, SuperRARef } from "../src/back-end/CellAddressing";

//these tests are strange, we will be testing them more in-depth in the specific types.
describe("Adjusted<Type> Tests", () => {
    test("Adjusted is constructed", () => {
        const rARef = new SuperRARef(false, 10, false, 10);
        const adj = new Adjusted<SuperRARef>(rARef, 100, true);
        expect(adj.maxValidRow).toBe(100);
    });
});
