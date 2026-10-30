import { statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

// Mirrors wrangler's getGlobalConfigPath: a legacy ~/.wrangler directory wins, otherwise the platform config dir.
function wranglerConfigDir() {
  const legacyDir = join(homedir(), ".wrangler");
  if (statSync(legacyDir, { throwIfNoEntry: false })?.isDirectory()) {
    return legacyDir;
  }
  if (platform() !== "darwin") {
    throw new Error(`wrangler-switch only knows wrangler's config location on macOS, not ${platform()}.`);
  }
  return join(homedir(), "Library", "Preferences", ".wrangler");
}

/** The OAuth login every wrangler version reads and refreshes. */
export const AUTH_FILE = join(wranglerConfigDir(), "config", "default.toml");

/** Where saved logins live, one `<name>.toml` per login. */
export const STORE_DIR = join(homedir(), ".config", "wrangler-switch");
