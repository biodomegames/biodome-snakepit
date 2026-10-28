// upload to production server web folder

import FtpDeploy from "ftp-deploy";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { loadProjectIdentity } from "./load-project-identity.mjs";
import { terminalHyperlink } from "./terminal-hyperlink.mjs";

const ftpDeploy = new FtpDeploy();

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(path.dirname(__filename), "..");

async function loadPassword() {
  try {
    const configData = await fs.readFile(path.join(projectRoot, "deployPassword.json"), "utf-8");
    const config = JSON.parse(configData);
    return config.password;
  } catch (err) {
    console.error("Error loading password:", err.message);
    process.exit(1);
  }
}

const verbose = process.argv.includes("--verbose") || process.env.DEPLOY_VERBOSE === "1";

function logStep(msg) {
  console.log(`[deploy] ${msg}`);
}

async function countFiles(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) total++;
    }
  }
  return total;
}

async function deploy() {
  const startedAt = Date.now();
  logStep("Starting deployment...");

  const t0 = Date.now();
  const password = await loadPassword();
  logStep(`Loaded FTP password in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const identity = loadProjectIdentity(projectRoot);
  logStep(`Loaded project identity in ${Date.now() - t1}ms`);
  const { host, user, remoteRoot, publicUrl } = identity.deploy;
  const localRoot = path.join(projectRoot, "dist");

  const t2 = Date.now();
  let fileCount = 0;
  try {
    fileCount = await countFiles(localRoot);
  } catch (err) {
    logStep(`Could not count local files: ${err.message}`);
  }
  logStep(`Prepared local build folder (${localRoot}) with ${fileCount} files in ${Date.now() - t2}ms`);

  const config = {
    user,
    password,
    host,
    port: 21,
    localRoot,
    remoteRoot,
    include: ["*", "**/*"],
    deleteRemote: false,
    forcePasv: true,
  };

  if (verbose) {
    let uploaded = 0;
    ftpDeploy.on("uploading", (data) => {
      const filename = data?.filename ?? data?.transferredFile ?? "unknown";
      logStep(`Uploading: ${filename}`);
    });
    ftpDeploy.on("uploaded", (data) => {
      uploaded++;
      const filename = data?.filename ?? data?.transferredFile ?? "unknown";
      logStep(`Uploaded (${uploaded}${fileCount ? `/${fileCount}` : ""}): ${filename}`);
    });
    ftpDeploy.on("upload-error", (data) => {
      const filename = data?.filename ?? "unknown";
      const err = data?.err?.message ?? "unknown error";
      logStep(`Upload error on ${filename}: ${err}`);
    });
  }

  try {
    logStep(`Connecting to ${host} and uploading to ${remoteRoot}...`);
    const uploadStart = Date.now();
    await ftpDeploy.deploy(config);
    logStep(`Upload finished in ${Date.now() - uploadStart}ms`);
    logStep(`Upload finished to ${config.remoteRoot}`);
    logStep(`Deployment URL: ${terminalHyperlink(publicUrl)}`);
    logStep(`Total deploy time: ${Date.now() - startedAt}ms`);
  } catch (err) {
    console.error("[deploy] Error during upload:", err);
    process.exitCode = 1;
  }
}

deploy();
