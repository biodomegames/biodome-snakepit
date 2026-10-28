#!/usr/bin/env node
/**
 * Set display name, slug, URLs, Cordova/npm ids, deploy paths, and marketing HTML.
 * Updates scripts/project-identity.json (source of truth for deploy scripts).
 *
 * Usage:
 *   node scripts/set-project-name.mjs --name "My Game"
 *   node scripts/set-project-name.mjs --name "My Game" --slug my-game --short MG
 *   node scripts/set-project-name.mjs --name "Words" --tagline "Word puzzles" --public-base-url https://biodomegames.com
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  readdirSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(path.dirname(__filename), "..");
const identityPath = path.join(projectRoot, "scripts", "project-identity.json");

function toSlug(s) {
  const slug = String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "game";
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--slug") out.slug = argv[++i];
    else if (a === "--short") out.short = argv[++i];
    else if (a === "--tagline") out.tagline = argv[++i];
    else if (a === "--public-base-url") out.publicBase = argv[++i];
    else if (a === "--npm-name") out.npmName = argv[++i];
    else if (a === "--cordova-widget-id") out.cordovaWidgetId = argv[++i];
    else if (a === "--frvr-game-id") out.frvrGameId = argv[++i];
    else if (a === "--cordova-package-name") out.cordovaPackageName = argv[++i];
    else if (a === "--cordova-display-name") out.cordovaDisplayName = argv[++i];
  }
  return out;
}

function loadOldIdentity() {
  if (!existsSync(identityPath)) {
    throw new Error(
      `Missing scripts/project-identity.json — restore from repo or copy scripts/project-identity.json from another clone.`
    );
  }
  return JSON.parse(readFileSync(identityPath, "utf-8"));
}

function buildNewIdentity(old, cli) {
  const displayName = cli.name ?? old.displayName;
  const slug = cli.slug ? toSlug(cli.slug) : toSlug(displayName);
  const tagline =
    cli.tagline !== undefined ? cli.tagline : old.tagline ?? "";
  const shortProjectName =
    cli.short !== undefined ? cli.short : old.shortProjectName ?? toSlug(displayName);
  const publicBase = (
    cli.publicBase ||
    old.deploy?.publicBaseUrl ||
    "https://biodomegames.com"
  ).replace(/\/$/, "");

  const cordovaWidgetId =
    cli.cordovaWidgetId || `games.biodome.${slug.replace(/-/g, "")}`;
  const npmPackageName = cli.npmName || slug;
  const frvrGameId = cli.frvrGameId || slug;
  const cordovaPackageName =
    cli.cordovaPackageName || `com.biodome.${slug.replace(/-/g, "")}`;
  const cordovaDisplayName = cli.cordovaDisplayName || displayName;

  const deployRemoteRoot = `www/biodomegames.com/${slug}`;
  const publicUrl = `${publicBase}/${slug}`;
  const deployDevRemoteRoot = `www.biodomegames.com/${slug}-dev`;
  const deployDevPublicUrl = `${publicBase}/${slug}-dev`;

  const termsLocalFolder = `${slug}-onlinefiles`;
  const termsRemoteRoot = `/www/sporkle.net/${slug}-onlinefiles`;

  return {
    displayName,
    shortProjectName,
    tagline,
    slug,
    cordovaWidgetId,
    npmPackageName,
    frvrGameId,
    cordovaPackageName,
    cordovaDisplayName,
    deploy: {
      host: old.deploy?.host ?? "web12.gigahost.dk",
      user: old.deploy?.user ?? "biodome",
      remoteRoot: deployRemoteRoot,
      publicBaseUrl: publicBase,
      publicUrl,
    },
    deployDev: {
      remoteRoot: deployDevRemoteRoot,
      publicUrl: deployDevPublicUrl,
    },
    termsInfo: {
      localFolder: termsLocalFolder,
      remoteRoot: termsRemoteRoot,
    },
    urls: {
      sporkleGame: `https://www.sporkle.net/${slug}`,
      biodomeSubdomain: `https://${slug}.biodomegames.com`,
      moreinfoPage: `https://biodomegames.com/${slug}/index2.html`,
    },
  };
}

/** Longest-first string replacements to limit partial matches. */
function buildPairs(old, neu) {
  const pairs = [];

  const oldTitle = `${old.displayName} - ${old.tagline ?? ""}`;
  const newTitle = `${neu.displayName} - ${neu.tagline ?? ""}`;
  if (oldTitle !== newTitle) pairs.push([oldTitle, newTitle]);

  const urlKeys = ["moreinfoPage", "sporkleGame", "biodomeSubdomain"];
  for (const k of urlKeys) {
    const a = old.urls?.[k];
    const b = neu.urls?.[k];
    if (a && b && a !== b) pairs.push([a, b]);
  }

  if (old.deploy?.publicUrl && neu.deploy?.publicUrl && old.deploy.publicUrl !== neu.deploy.publicUrl) {
    pairs.push([old.deploy.publicUrl, neu.deploy.publicUrl]);
  }
  if (old.deployDev?.publicUrl && neu.deployDev?.publicUrl && old.deployDev.publicUrl !== neu.deployDev.publicUrl) {
    pairs.push([old.deployDev.publicUrl, neu.deployDev.publicUrl]);
  }

  if (old.termsInfo?.localFolder && neu.termsInfo?.localFolder && old.termsInfo.localFolder !== neu.termsInfo.localFolder) {
    pairs.push([`/${old.termsInfo.localFolder}`, `/${neu.termsInfo.localFolder}`]);
    pairs.push([old.termsInfo.localFolder, neu.termsInfo.localFolder]);
  }

  if (old.cordovaWidgetId !== neu.cordovaWidgetId) {
    pairs.push([old.cordovaWidgetId, neu.cordovaWidgetId]);
  }
  if (old.cordovaPackageName !== neu.cordovaPackageName) {
    pairs.push([old.cordovaPackageName, neu.cordovaPackageName]);
  }
  if (old.cordovaDisplayName !== neu.cordovaDisplayName) {
    pairs.push([old.cordovaDisplayName, neu.cordovaDisplayName]);
  }
  if (old.npmPackageName !== neu.npmPackageName) {
    pairs.push([old.npmPackageName, neu.npmPackageName]);
  }
  if (old.frvrGameId !== neu.frvrGameId) {
    pairs.push([`gameId: "${old.frvrGameId}"`, `gameId: "${neu.frvrGameId}"`]);
  }
  if (old.slug !== neu.slug) {
    pairs.push([`${old.slug}_`, `${neu.slug}_`]);
    pairs.push([`${old.slug}-`, `${neu.slug}-`]);
    pairs.push([old.slug, neu.slug]);
  }
  if (old.displayName !== neu.displayName) {
    pairs.push([old.displayName, neu.displayName]);
  }
  if (old.shortProjectName !== neu.shortProjectName) {
    pairs.push([old.shortProjectName, neu.shortProjectName]);
  }
  if ((old.tagline ?? "") !== (neu.tagline ?? "") && old.tagline) {
    pairs.push([old.tagline, neu.tagline]);
  }

  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

function applyReplacements(content, pairs) {
  let s = content;
  for (const [from, to] of pairs) {
    if (!from || from === to) continue;
    s = s.split(from).join(to);
  }
  return s;
}

const TEXT_FILES = [
  "index.html",
  "vite.config.js",
  "cordova/config.xml",
  "src/js/config.js",
  "src/js/crashlogviewer.js",
  "src/js/crashlogger.js",
  "src/js/utils/data_screenshotsizes.js",
  "src/web/privacy/index.html",
  "src/web/moreinfo/index.html",
];

function patchJsonFile(relPath, fn) {
  const p = path.join(projectRoot, relPath);
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf-8");
  const obj = JSON.parse(raw);
  fn(obj);
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function renameAssetDirs() {
  const dirs = [
    path.join(projectRoot, "web"),
    path.join(projectRoot, "src", "web", "moreinfo", "images"),
    path.join(projectRoot, "src", "web", "privacy", "images"),
  ];
  return dirs;
}

function renamePngFiles(oldSlug, newSlug) {
  if (oldSlug === newSlug) return;
  for (const dir of renameAssetDirs()) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".png")) continue;
      if (!f.includes(oldSlug)) continue;
      const next = f.split(oldSlug).join(newSlug);
      if (next !== f) {
        renameSync(path.join(dir, f), path.join(dir, next));
        console.log(`Renamed ${path.relative(projectRoot, path.join(dir, f))} → ${next}`);
      }
    }
  }
}

function renameTermsFolder(oldFolder, newFolder) {
  if (oldFolder === newFolder) return;
  const a = path.join(projectRoot, oldFolder);
  const b = path.join(projectRoot, newFolder);
  if (existsSync(a) && !existsSync(b)) {
    renameSync(a, b);
    console.log(`Renamed folder ${oldFolder} → ${newFolder}`);
  }
}

function main() {
  const cli = parseArgs(process.argv);
  if (cli.help) {
    console.log(`
Set project display name, slug, deploy URLs, Cordova/npm identifiers, and HTML.

Required:
  --name "Game Title"     Human-readable app / window title

Optional:
  --slug my-game          URL segment (default: slugified --name)
  --short MG              src/js/config.js projectName (short id)
  --tagline "..."         Subtitle for og:title (default: keep existing)
  --public-base-url URL   Site root for deploy URL (default: https://biodomegames.com)
  --npm-name              package.json "name" (default: slug)
  --cordova-widget-id     config.xml widget id
  --frvr-game-id          FRVR gameId in index.html
  --cordova-package-name  cordova/package.json name
  --cordova-display-name  cordova/package.json displayName

Updates scripts/project-identity.json and source files; renames <slug>-onlinefiles
and web images that use the old slug prefix when present.

Afterwards run: npm run build  (and cordova update-game if you ship native builds)
`);
    process.exit(0);
  }

  const optionKeys = Object.keys(cli).filter((k) => k !== "help");
  if (optionKeys.length === 0) {
    console.error('Pass at least one option (e.g. --name "My Game"). Use --help for usage.');
    process.exit(1);
  }

  const old = loadOldIdentity();
  const neu = buildNewIdentity(old, cli);

  const pairs = buildPairs(old, neu);

  for (const rel of TEXT_FILES) {
    const p = path.join(projectRoot, rel);
    if (!existsSync(p)) continue;
    let content = readFileSync(p, "utf-8");
    const next = applyReplacements(content, pairs);
    if (next !== content) {
      writeFileSync(p, next, "utf-8");
      console.log("Updated", rel);
    }
  }

  patchJsonFile("package.json", (o) => {
    o.name = neu.npmPackageName;
  });
  patchJsonFile("cordova/package.json", (o) => {
    o.name = neu.cordovaPackageName;
    o.displayName = neu.cordovaDisplayName;
  });

  writeFileSync(identityPath, JSON.stringify(neu, null, 2) + "\n", "utf-8");
  console.log("Wrote scripts/project-identity.json");

  renameTermsFolder(old.termsInfo?.localFolder, neu.termsInfo.localFolder);
  renamePngFiles(old.slug, neu.slug);

  console.log("");
  console.log("Deployment URL (production): " + neu.deploy.publicUrl);
  console.log("Dev deployment URL:         " + neu.deployDev.publicUrl);
}

main();
