#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");

function resolveNpmInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...args],
      display: `npm ${args.join(" ")}`,
    };
  }
  return {
    command: "npm",
    args,
    display: `npm ${args.join(" ")}`,
  };
}

function printUsage() {
  console.log(`
Usage:
  node scripts/publish-npm.mjs [options]

Options:
  --dry-run           Only simulate publishing
  --bump <type>       Version bump type when auto-incrementing, default: patch
  --force-bump        Always bump before publish, even if current version is unpublished
  --tag <tag>         Publish under a dist-tag
  --otp <code>        Pass npm 2FA code
  --access <level>    npm publish access level, default: public
  --with-scripts      Do not append --ignore-scripts
  -h, --help          Show this help
`);
}

function readPackageJson(dir) {
  const packageJsonPath = path.join(dir, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function writePackageJson(dir, pkg) {
  const packageJsonPath = path.join(dir, "package.json");
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function runNpm(args, options = {}) {
  const invocation = resolveNpmInvocation(args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd ?? ROOT_DIR,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const stderr = (result.stderr || "").trim();
    throw new Error(
      `${invocation.display} failed in ${options.cwd ?? ROOT_DIR}${stderr ? `: ${stderr}` : ""}`,
    );
  }

  return result;
}

function resolvePublishedVersions(packageName) {
  const result = runNpm(["view", packageName, "versions", "--json"], {
    capture: true,
    allowFailure: true,
  });

  if (result.status !== 0) {
    const stderr = `${result.stderr || ""}${result.stdout || ""}`;
    if (/E404|404 Not Found|is not in this registry/i.test(stderr)) {
      return [];
    }
    throw new Error(`Failed to query published versions for ${packageName}: ${stderr.trim()}`);
  }

  const raw = (result.stdout || "").trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  if (typeof parsed === "string") return [parsed];
  if (Array.isArray(parsed)) return parsed;
  return [];
}

function ensureLoggedIn() {
  const result = runNpm(["whoami"], { capture: true, allowFailure: true });
  if (result.status === 0) {
    return (result.stdout || "").trim();
  }
  throw new Error("npm login is required before publishing. Run `npm login` first.");
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? undefined,
  };
}

function compareIdentifiers(left, right) {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }
  if (leftIsNumeric) return -1;
  if (rightIsNumeric) return 1;
  return left.localeCompare(right);
}

function comparePrerelease(left, right) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const diff = compareIdentifiers(leftPart, rightPart);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function compareVersions(left, right) {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major;
  }
  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor;
  }
  if (parsedLeft.patch !== parsedRight.patch) {
    return parsedLeft.patch - parsedRight.patch;
  }
  return comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease);
}

function resolveLatestVersion(versions) {
  if (versions.length === 0) return undefined;
  return versions.reduce((latest, candidate) =>
    compareVersions(candidate, latest) > 0 ? candidate : latest,
  );
}

function incrementVersion(version, bumpType) {
  const parsed = parseSemver(version);

  switch (bumpType) {
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "major":
      return `${parsed.major + 1}.0.0`;
    default:
      throw new Error(`Unsupported bump type: ${bumpType}`);
  }
}

function resolveTargetVersion(pkgVersion, latestPublishedVersion, options) {
  if (!latestPublishedVersion) {
    if (options.forceBump) {
      return {
        targetVersion: incrementVersion(pkgVersion, options.bump),
        changed: true,
        reason: `forced ${options.bump} bump before first publish`,
      };
    }

    return {
      targetVersion: pkgVersion,
      changed: false,
      reason: "first publish uses current package.json version",
    };
  }

  const currentIsAhead = compareVersions(pkgVersion, latestPublishedVersion) > 0;
  if (currentIsAhead && !options.forceBump) {
    return {
      targetVersion: pkgVersion,
      changed: false,
      reason: "current package.json version is already unpublished",
    };
  }

  const baseVersion =
    options.forceBump && currentIsAhead ? pkgVersion : latestPublishedVersion;

  return {
    targetVersion: incrementVersion(baseVersion, options.bump),
    changed: true,
    reason: options.forceBump
      ? `forced ${options.bump} bump from ${baseVersion}`
      : `${pkgVersion} is already published or behind npm, auto-bumped ${options.bump} from ${baseVersion}`,
  };
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    bump: "patch",
    forceBump: false,
    tag: undefined,
    otp: undefined,
    access: "public",
    withScripts: false,
  };

  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) continue;

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force-bump") {
      options.forceBump = true;
      continue;
    }

    if (arg === "--bump") {
      options.bump = args.shift();
      if (!options.bump) {
        throw new Error("--bump requires a value.");
      }
      continue;
    }

    if (arg.startsWith("--bump=")) {
      options.bump = arg.slice("--bump=".length);
      continue;
    }

    if (arg === "--with-scripts") {
      options.withScripts = true;
      continue;
    }

    if (arg === "--tag") {
      options.tag = args.shift();
      if (!options.tag) {
        throw new Error("--tag requires a value.");
      }
      continue;
    }

    if (arg.startsWith("--tag=")) {
      options.tag = arg.slice("--tag=".length);
      continue;
    }

    if (arg === "--otp") {
      options.otp = args.shift();
      if (!options.otp) {
        throw new Error("--otp requires a value.");
      }
      continue;
    }

    if (arg.startsWith("--otp=")) {
      options.otp = arg.slice("--otp=".length);
      continue;
    }

    if (arg === "--access") {
      options.access = args.shift();
      if (!options.access) {
        throw new Error("--access requires a value.");
      }
      continue;
    }

    if (arg.startsWith("--access=")) {
      options.access = arg.slice("--access=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!["patch", "minor", "major"].includes(options.bump)) {
    throw new Error(`Unsupported bump type: ${options.bump}`);
  }

  return options;
}

function buildPublishArgs(options) {
  const args = ["publish", "--access", options.access];
  if (options.dryRun) {
    args.push("--dry-run");
  }
  if (options.tag) {
    args.push("--tag", options.tag);
  }
  if (options.otp) {
    args.push("--otp", options.otp);
  }
  if (!options.withScripts) {
    args.push("--ignore-scripts");
  }
  return args;
}

function publishOne(options) {
  const pkg = readPackageJson(ROOT_DIR);
  const publishedVersions = resolvePublishedVersions(pkg.name);
  const latestPublishedVersion = resolveLatestVersion(publishedVersions);
  const versionPlan = resolveTargetVersion(pkg.version, latestPublishedVersion, options);
  const targetPkg = {
    ...pkg,
    version: versionPlan.targetVersion,
  };

  console.log(`\npackage: ${pkg.name}`);
  console.log(`directory: ${ROOT_DIR}`);
  console.log(`current package.json version: ${pkg.version}`);

  if (latestPublishedVersion) {
    console.log(`latest published: ${latestPublishedVersion}`);
  } else {
    console.log("latest published: (not found)");
  }

  console.log(`target publish version: ${versionPlan.targetVersion}`);
  console.log(`version strategy: ${versionPlan.reason}`);

  if (versionPlan.changed) {
    writePackageJson(ROOT_DIR, targetPkg);
    if (options.dryRun) {
      console.log(`package.json temporarily updated for dry-run: ${pkg.version} -> ${versionPlan.targetVersion}`);
    } else {
      console.log(`package.json updated: ${pkg.version} -> ${versionPlan.targetVersion}`);
    }
  }

  const publishArgs = buildPublishArgs(options);
  console.log(`command: ${resolveNpmInvocation(publishArgs).display}`);

  try {
    runNpm(publishArgs, { cwd: ROOT_DIR });
    if (options.dryRun && versionPlan.changed) {
      writePackageJson(ROOT_DIR, pkg);
      console.log(`package.json restored after dry-run: ${versionPlan.targetVersion} -> ${pkg.version}`);
    }
  } catch (err) {
    if (versionPlan.changed) {
      writePackageJson(ROOT_DIR, pkg);
      console.log(`package.json restored: ${versionPlan.targetVersion} -> ${pkg.version}`);
    }
    throw err;
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const npmUser = ensureLoggedIn();

  console.log(`npm user: ${npmUser}`);
  console.log(`mode: ${options.dryRun ? "dry-run" : "publish"}`);
  console.log(`bump type: ${options.bump}`);
  if (options.forceBump) {
    console.log("version bump mode: always bump before publish");
  }
  if (!options.withScripts) {
    console.log("lifecycle scripts: skipped by default (--ignore-scripts)");
  }

  publishOne(options);

  console.log("\nPublish flow completed.");
} catch (err) {
  console.error(`\n[publish-npm] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
