import { describe, expect, test } from "vitest";
import {
    A1RefCellAddress,
    R1C1RARef,
    RARefCellAddress,
    SuperCellAddress,
    SuperRARef,
} from "../back-end/CellAddressing";

describe("Cell Addressing tests", () => {
    test("A1 Cell Address construction", () => {
        const a1ref = new A1RefCellAddress("A2");

        expect(a1ref.toString()).toBe("A2");
    });

    test("RARef Cell Address construction", () => {
        const raref = new SuperRARef(false, 0, false, 1);

        const rarefCA = new RARefCellAddress(raref, 0, 0);

        expect(rarefCA.toString()).toBe("A2");
    });

    test("SuperCellAddress construction", () => {
        const superCA = new SuperCellAddress(0, 1);

        expect(superCA.toString()).toBe("A2");
    });

    //Reevaluate this test
    test("R1C1RARef Cell Address construction", () => {
        const r1c1raref = new R1C1RARef("R2C1");

        const rarefCA = new RARefCellAddress(r1c1raref, 0, 0);

        expect(rarefCA.toString()).toBe("A2");
    });
});
