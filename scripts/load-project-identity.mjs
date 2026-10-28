import { readFileSync, existsSync } from "fs";
import path from "path";

/**
 * @param {string} projectRoot Absolute path to repo root (parent of scripts/)
 */
export function loadProjectIdentity(projectRoot) {
  const p = path.join(projectRoot, "scripts", "project-identity.json");
  if (!existsSync(p)) {
    throw new Error(
      `Missing ${path.relative(projectRoot, p)}. Run: npm run set-project-name -- --name "Your Game"`
    );
  }
  return JSON.parse(readFileSync(p, "utf-8"));
}
