import { WEIXIN_PLUGIN_ID } from "./constants.js";
import { logger } from "./util/logger.js";

export const SUPPORTED_HOST_MIN = "2026.3.22";

export interface OpenClawVersion {
  year: number;
  month: number;
  day: number;
}

export function parseOpenClawVersion(version: string): OpenClawVersion | null {
  const base = version.trim().split("-")[0];
  const parts = base.split(".");
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  return { year, month, day };
}

export function compareVersions(a: OpenClawVersion, b: OpenClawVersion): -1 | 0 | 1 {
  for (const key of ["year", "month", "day"] as const) {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
  }
  return 0;
}

export function isHostVersionSupported(hostVersion: string): boolean {
  const host = parseOpenClawVersion(hostVersion);
  if (!host) return false;

  const min = parseOpenClawVersion(SUPPORTED_HOST_MIN);
  if (!min) {
    throw new Error(`Invalid SUPPORTED_HOST_MIN: ${SUPPORTED_HOST_MIN}`);
  }

  return compareVersions(host, min) >= 0;
}

export function assertHostCompatibility(hostVersion: string | undefined): void {
  if (!hostVersion || hostVersion === "unknown") {
    logger.warn(
      `[compat] Could not determine host OpenClaw version; skipping compatibility check.`,
    );
    return;
  }

  if (isHostVersionSupported(hostVersion)) {
    logger.info(`[compat] Host OpenClaw ${hostVersion} >= ${SUPPORTED_HOST_MIN}, OK.`);
    return;
  }

  throw new Error(
    `${WEIXIN_PLUGIN_ID} requires OpenClaw >=${SUPPORTED_HOST_MIN}, but found ${hostVersion}. ` +
    `Please upgrade OpenClaw before loading this plugin.`,
  );
}
