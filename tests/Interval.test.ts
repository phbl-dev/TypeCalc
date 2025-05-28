import { describe, expect, test, vi } from "vitest";
import { Interval } from "../src/back-end/CellAddressing";

describe("Interval Tests", () => {
  test("Wrong interval throws error", () => {
    expect(() => new Interval(2, 1)).toThrowError();
  });

  test("Interval is the right size", () => {
    const testInterval: Interval = new Interval(3, 6);
    expect(testInterval.length()).toBe(4);
  });

  test("Interval is inclusive in beginning", () => {
    const testInterval: Interval = new Interval(3, 6);
    expect(testInterval.contains(3)).toBe(true);
  });

  test("Interval is inclusive in end", () => {
    const testInterval: Interval = new Interval(3, 6);
    expect(testInterval.contains(6)).toBe(true);
  });

  test("Interval calls action on all members", () => {
    const testInterval: Interval = new Interval(2, 5);
    const testAction = vi.fn();

    testInterval.forEach(testAction);

    expect(testAction).toHaveBeenCalledTimes(4);
  });

  test("Union preserves all members", () => {
    const testInterval: Interval = new Interval(1, 3);
    const testInterval2: Interval = new Interval(3, 5);

    const testUnion: Interval = testInterval.union(testInterval2);

    expect(testUnion.length()).toBe(5);
  });

  test("Intersect preserves overlapping members", () => {
    const testInterval: Interval = new Interval(1, 3);
    const testInterval2: Interval = new Interval(3, 5);

    const testIntersection: Interval = testInterval.intersect(testInterval2);

    expect(testIntersection.length()).toBe(1);
  });

  test("New unions are equal to directly generated intervals", () => {
    const testInterval: Interval = new Interval(1, 3);
    const testInterval2: Interval = new Interval(3, 5);
    const compareInterval: Interval = new Interval(1, 5);

    const testUnion: Interval = testInterval.union(testInterval2);

    expect(testUnion.equals(compareInterval)).toBe(true);
  });

  test("New intersections are equal to directly generated intervals", () => {
    const testInterval: Interval = new Interval(1, 3);
    const testInterval2: Interval = new Interval(3, 5);
    const compareInterval: Interval = new Interval(3, 3);

    const testIntersection: Interval = testInterval.intersect(testInterval2);

    expect(testIntersection.equals(compareInterval)).toBe(true);
  });

  test("Non-overlapping Union throws error", () => {
    const testInterval: Interval = new Interval(1, 2);
    const testInterval2: Interval = new Interval(3, 5);
    expect(() => testInterval.union(testInterval2)).toThrowError();
  });

  test("Non-overlapping Intersection throws error", () => {
    const testInterval: Interval = new Interval(1, 2);
    const testInterval2: Interval = new Interval(3, 5);
    expect(() => testInterval.intersect(testInterval2)).toThrowError();
  });

  test("Overlaps", () => {
    const testInterval: Interval = new Interval(1, 3);
    const testInterval2: Interval = new Interval(3, 5);
    const testInterval3: Interval = new Interval(3, 3);

    expect(testInterval.overlaps(testInterval2)).toBe(true);
    expect(testInterval2.overlaps(testInterval)).toBe(true);
    expect(testInterval.overlaps(testInterval3)).toBe(true);
    expect(testInterval2.overlaps(testInterval3)).toBe(true);
    expect(testInterval3.overlaps(testInterval)).toBe(true);
  });
});
