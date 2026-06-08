import { describe, expect, it } from "vitest";
import { setOverride, clearOverride, getProductOverrides } from "@/lib/wps-overrides";
import type { WpsOverrides } from "@/lib/types";

/** Pure-reducer tests for the override store (no DOM — @testing-library is not installed). */

const ov = (subscore: number) => ({ subscore, updatedAt: "t" });

describe("wps-overrides — pure reducer", () => {
  it("setOverride nests under asin → key and does not mutate the input", () => {
    const s0: WpsOverrides = {};
    const s1 = setOverride(s0, "A1", "size", ov(90));
    expect(s1).not.toBe(s0);
    expect(s0).toEqual({}); // original untouched
    expect(s1.A1?.size?.subscore).toBe(90);
  });

  it("adds a sibling criterion without dropping existing ones", () => {
    let s = setOverride({}, "A1", "size", ov(90));
    s = setOverride(s, "A1", "price", ov(80));
    expect(Object.keys(s.A1!)).toEqual(["size", "price"]);
  });

  it("clearOverride removes only the targeted key", () => {
    let s = setOverride({}, "A1", "size", ov(90));
    s = setOverride(s, "A1", "price", ov(80));
    const c = clearOverride(s, "A1", "size");
    expect(c.A1?.size).toBeUndefined();
    expect(c.A1?.price?.subscore).toBe(80);
  });

  it("clearing the last key drops the asin entry entirely", () => {
    const s = setOverride({}, "A1", "size", ov(90));
    expect(clearOverride(s, "A1", "size").A1).toBeUndefined();
  });

  it("clearing an unknown key/asin is a no-op (same reference)", () => {
    const s = setOverride({}, "A1", "size", ov(90));
    expect(clearOverride(s, "A1", "price")).toBe(s);
    expect(clearOverride(s, "ZZ", "size")).toBe(s);
  });

  it("getProductOverrides returns {} for an unknown asin", () => {
    expect(getProductOverrides({}, "nope")).toEqual({});
  });
});
