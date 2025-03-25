import { beforeEach, describe, expect, test } from "vitest";
import { HashBag } from "../src/back-end/Types";

describe("HashBag", () => {
    let hb: HashBag<string>;
    let xs: string[];

    beforeEach(() => {
        hb = new HashBag();
        xs = ["Hello", "World", "!"];
    });

    function getSize<T>(hb: HashBag<T>): number {
        return hb["multiplicity"].size;
    }

    describe("Testing HashBag Add() and Remove()", () => {
        test("Add an item then remove it.", () => {
            hb.Add("Hello");
            expect(hb.Remove("Hello")).toBe(true); //Verifies that Add() worked
            expect(getSize(hb)).toEqual(0); //Verifies that Remove() worked
        });
        test("Try to remove an item that doesn't exist", () => {
            expect(hb.Remove("Hello")).toBe(false);
        });
        test("Add an item twice then remove it once.", () => {
            hb.Add("Hello");
            hb.Add("Hello");
            hb.Remove("Hello");
            expect(getSize(hb)).toBe(1);
        });
    });

    describe("Testing HashBag AddAll() and RemoveAll()", () => {
        test("Add items from xs then remove them.", () => {
            hb.AddAll(xs);
            hb.RemoveAll(xs);
            expect(getSize(hb)).toBe(0);
        });
        test("Add items from xs then RemoveAll() once", () => {
            hb.Add("Hello");
            hb.AddAll(xs);
            hb.AddAll(xs);
            hb.RemoveAll(xs);
            hb.RemoveAll(xs);
            expect(getSize(hb)).toBe(1); //Check that it doesn't just clear
        });
        test("We add items from xs.", () => {
            hb.AddAll(xs);
            expect(getSize(hb)).toBe(3);
        });
    });

    describe("Testing HashBag Clear()", () => {
        test("Add several items and then clear them.", () => {
            hb.Add("Hello");
            hb.AddAll(xs);
            hb.Clear();
            expect(getSize(hb)).toBe(0);
        });
    });

    describe("Testing HashBag ItemMultiplicities()", () => {
        test("Add several items then yield the entries to an array.", () => {
            hb.AddAll(xs);
            hb.Add("Hello");
            const arr = Array.from(hb.ItemMultiplicities());
            expect(arr).toEqual([
                ["Hello", 2],
                ["World", 1],
                ["!", 1],
            ]);
        });
        test("Check the entries are in expected order", () => {
            hb.Add("First");
            hb.Add("Second");
            hb.Add("Third");
            const arr = Array.from(hb.ItemMultiplicities());
            expect(arr[0]).toEqual(["First", 1]);
        });
    });

    describe("Testing HashBag GetEnumerator()", () => {
        let itr: Iterator<string>;

        test("Add several items then yield keys to an array", () => {
            const arr: string[] = [];
            hb.AddAll(xs);
            hb.Add("Hello");
            itr = hb.GetEnumerator();
            let next = itr.next();
            while (!next.done) {
                arr.push(next.value);
                next = itr.next();
            }
            expect(arr).toEqual(["Hello", "Hello", "World", "!"]);
        });
        test("Check the entries are in expected order", () => {
            const arr: string[] = [];
            hb.AddAll(xs);
            itr = hb.GetEnumerator();
            let next = itr.next();
            while (!next.done) {
                arr.push(next.value);
                next = itr.next();
            }
            expect(arr[0]).toBe("Hello");
        });
    });
});
