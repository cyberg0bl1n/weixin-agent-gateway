import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

type TmpDirResolverModule = {
  resolvePreferredOpenClawTmpDir?: () => string;
};

const require = createRequire(import.meta.url);

let cachedTmpDir: string | null = null;

function tryResolveFrom(specifier: string): string | null {
  try {
    const mod = require(specifier) as TmpDirResolverModule;
    if (typeof mod.resolvePreferredOpenClawTmpDir === "function") {
      return mod.resolvePreferredOpenClawTmpDir();
    }
  } catch {
    // Optional runtime dependency: fall back when the host package is absent.
  }
  return null;
}

export function resolveWeixinPreferredTmpDir(): string {
  if (cachedTmpDir) {
    return cachedTmpDir;
  }

  cachedTmpDir =
    tryResolveFrom("openclaw/plugin-sdk") ??
    tryResolveFrom("openclaw/plugin-sdk/infra-runtime") ??
    path.join(os.tmpdir(), "openclaw");

  return cachedTmpDir;
}
