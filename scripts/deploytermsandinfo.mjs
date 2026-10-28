import FtpDeploy from "ftp-deploy";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { loadProjectIdentity } from "./load-project-identity.mjs";

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

async function deploy() {
  const password = await loadPassword();
  const identity = loadProjectIdentity(projectRoot);
  const { host, user } = identity.deploy;
  const { localFolder, remoteRoot } = identity.termsInfo;

  const localRoot = path.join(projectRoot, localFolder);

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

  ftpDeploy
    .deploy(config)
    .then(() => console.log("Upload finished to " + config.remoteRoot))
    .catch((err) => console.error("Error during upload:", err));
}

deploy();
