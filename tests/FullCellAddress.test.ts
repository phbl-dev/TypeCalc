import { describe, expect, test } from "vitest";
import {
    A1RefCellAddress,
    FullCellAddress,
    RARefCellAddress,
    SuperRARef,
} from "../src/back-end/CellAddressing";
import { Sheet } from "../src/back-end/Sheet";
import { Workbook } from "../src/back-end/Workbook";

describe("Full Cell Addressing tests", () => {
    test("A1 Full Cell Address construction", () => {
        const sheet = new Sheet(new Workbook(),"test_sheet",false);
        const a1refFCA = new FullCellAddress(
            sheet,
            undefined,
            undefined,
            undefined,
            "A2",
        );

        expect(a1refFCA.toString()).toBe("test_sheet!A2");
    });

    test("C0R0 Full Cell Address construction", () => {
        const sheet = new Sheet(new Workbook(), "test_sheet", false);
        const c0r0refFCA = new FullCellAddress(sheet, undefined, 0, 1, undefined);

        expect(c0r0refFCA.toString()).toBe("test_sheet!A2");
    });

    test("FCA created from a1RARef", () => {
        const sheet = new Sheet(new Workbook(),"test_sheet", false);
        const a1CA = new A1RefCellAddress("A2");

        const fCA = new FullCellAddress(
            sheet,
            a1CA,
            undefined,
            undefined,
            undefined,
        );

        expect(fCA.toString()).toBe("test_sheet!A2");
    });

    test("FCA created from RARef", () => {
        const sheet = new Sheet(new Workbook(), "test_sheet", false);
        const raref = new SuperRARef(false, 0, false, 1);
        const rarefCA = new RARefCellAddress(raref, 0, 0);
        const rarefFCA = new FullCellAddress(sheet, rarefCA);

        expect(rarefFCA.toString()).toBe("test_sheet!A2");
    });

    test("Address equality between construction types", () => {
        const sheet = new Sheet(new Workbook(), "test_sheet", false);
        const raref = new SuperRARef(false, 0, false, 1);
        const rarefCA = new RARefCellAddress(raref, 0, 0);
        const rarefFCA = new FullCellAddress(sheet, rarefCA);
        const a1CA = new A1RefCellAddress("A2");
        const a1FCA = new FullCellAddress(
            sheet,
            a1CA,
            undefined,
            undefined,
            undefined,
        );
        const c0r0refFCA = new FullCellAddress(sheet, undefined, 0, 1, undefined);
        const a1refFCA = new FullCellAddress(
            sheet,
            undefined,
            undefined,
            undefined,
            "A2",
        );
        expect(rarefFCA.equals(a1FCA)).toBe(true);
        expect(rarefFCA.equals(c0r0refFCA)).toBe(true);
        expect(rarefFCA.equals(a1refFCA)).toBe(true);
        expect(a1FCA.equals(c0r0refFCA)).toBe(true);
        expect(a1FCA.equals(a1refFCA)).toBe(true);
        expect(c0r0refFCA.equals(a1refFCA)).toBe(true);
    });

    //Not yet ready because sheet hashcode is unimplemented.
    test("Hashcode generation", () => {});
});
