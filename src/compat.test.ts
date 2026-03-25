import { describe, expect, it } from "vitest";

import {
  compareVersions,
  isHostVersionSupported,
  parseOpenClawVersion,
  SUPPORTED_HOST_MIN,
} from "./compat.js";

describe("compat", () => {
  it("parses OpenClaw date versions", () => {
    expect(parseOpenClawVersion("2026.3.22")).toEqual({
      year: 2026,
      month: 3,
      day: 22,
    });
    expect(parseOpenClawVersion("2026.3.22-beta.1")).toEqual({
      year: 2026,
      month: 3,
      day: 22,
    });
    expect(parseOpenClawVersion("not-a-version")).toBeNull();
  });

  it("compares parsed versions in chronological order", () => {
    const min = parseOpenClawVersion(SUPPORTED_HOST_MIN);
    const newer = parseOpenClawVersion("2026.3.23");
    const older = parseOpenClawVersion("2026.3.21");

    expect(min).not.toBeNull();
    expect(newer).not.toBeNull();
    expect(older).not.toBeNull();

    expect(compareVersions(min!, min!)).toBe(0);
    expect(compareVersions(newer!, min!)).toBe(1);
    expect(compareVersions(older!, min!)).toBe(-1);
  });

  it("rejects hosts older than the supported minimum", () => {
    expect(isHostVersionSupported("2026.3.22")).toBe(true);
    expect(isHostVersionSupported("2026.3.22-beta.1")).toBe(true);
    expect(isHostVersionSupported("2026.3.21")).toBe(false);
  });
});
