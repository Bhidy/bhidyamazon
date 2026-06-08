import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format";

/**
 * Hydration-safety guard. `formatDate` must pin the marketplace timezone so the
 * server (UTC on Vercel) and the browser (any zone) render the SAME calendar day.
 * A near-midnight-UTC timestamp would otherwise produce "Jun 8" on the server and
 * "Jun 9" in the client → React #418 hydration text mismatch (regression seen in
 * production 2026-06-08). Egypt (Africa/Cairo) is +2/+3, so 22:47Z → Jun 9.
 */
describe("formatDate — timezone-pinned for hydration safety", () => {
  it("renders a near-midnight-UTC timestamp as the Cairo calendar day", () => {
    expect(formatDate("2026-06-08T22:47:18Z")).toBe("Jun 9, 2026");
  });
  it("is stable for a mid-day timestamp", () => {
    expect(formatDate("2026-06-08T11:52:25Z")).toBe("Jun 8, 2026");
  });
  it("handles null/invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});
