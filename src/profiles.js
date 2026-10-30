import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { AUTH_FILE, STORE_DIR } from "./paths.js";

/** An error caused by how the tool was used, shown without a stack trace. */
export class UserError extends Error {}

/** What wrangler's default.toml currently is. */
export const LoginState = Object.freeze({
  NONE: "none",
  UNSAVED: "unsaved",
  PROFILE: "profile",
});

const PROFILE_EXTENSION = ".toml";
const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function profilePath(name) {
  return join(STORE_DIR, `${name}${PROFILE_EXTENSION}`);
}

function validateName(name) {
  if (!NAME_PATTERN.test(name)) {
    throw new UserError(`Invalid name "${name}". Use letters, numbers, "-" and "_".`);
  }
}

function assertExists(name) {
  if (!existsSync(profilePath(name))) {
    throw new UserError(`No saved login named "${name}". Saved: ${listProfiles().join(", ") || "none"}.`);
  }
}

function assertNew(name) {
  if (existsSync(profilePath(name))) {
    throw new UserError(`A login named "${name}" is already saved.`);
  }
}

// Points default.toml at a saved login. wrangler writes refreshed tokens through the symlink,
// so the saved file always holds the latest tokens.
function link(name) {
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  const tempLink = `${AUTH_FILE}.wrangler-switch`;
  symlinkSync(profilePath(name), tempLink);
  renameSync(tempLink, AUTH_FILE);
}

export function listProfiles() {
  if (!existsSync(STORE_DIR)) {
    return [];
  }
  return readdirSync(STORE_DIR)
    .filter((file) => file.endsWith(PROFILE_EXTENSION))
    .map((file) => basename(file, PROFILE_EXTENSION))
    .sort();
}

export function currentLogin() {
  const stat = lstatSync(AUTH_FILE, { throwIfNoEntry: false });
  if (!stat) {
    return { state: LoginState.NONE };
  }
  if (!stat.isSymbolicLink()) {
    return { state: LoginState.UNSAVED };
  }
  const target = readlinkSync(AUTH_FILE);
  if (dirname(target) !== STORE_DIR) {
    throw new Error(`${AUTH_FILE} is a symlink to ${target}, which wrangler-switch does not manage.`);
  }
  return { state: LoginState.PROFILE, profile: basename(target, PROFILE_EXTENSION) };
}

function assertNotUnsaved(login) {
  if (login.state === LoginState.UNSAVED) {
    throw new UserError("The current wrangler login isn't saved yet. Run `wsw save <name>` first so it isn't lost.");
  }
}

/** Saves the login wrangler is using right now under `name` and makes it active. */
export function save(name) {
  validateName(name);
  const login = currentLogin();
  if (login.state === LoginState.NONE) {
    throw new UserError("wrangler isn't logged in. Run `wsw add <name>` to log in and save the login.");
  }
  if (login.state === LoginState.PROFILE) {
    throw new UserError(`The current login is already saved as "${login.profile}".`);
  }
  assertNew(name);
  mkdirSync(STORE_DIR, { recursive: true, mode: 0o700 });
  renameSync(AUTH_FILE, profilePath(name));
  link(name);
}

/** Runs `wrangler login` for a new account and saves it under `name`. */
export function add(name, loginArgs) {
  validateName(name);
  assertNew(name);
  const login = currentLogin();
  assertNotUnsaved(login);
  // Detach the active login so `wrangler login` writes a new file instead of overwriting it.
  if (login.state === LoginState.PROFILE) {
    unlinkSync(AUTH_FILE);
  }
  const result = spawnSync("wrangler", ["login", ...loginArgs], { stdio: "inherit" });
  if (result.error || result.status !== 0 || !existsSync(AUTH_FILE)) {
    if (login.state === LoginState.PROFILE) {
      link(login.profile);
    }
    throw result.error ?? new UserError("`wrangler login` did not complete, so nothing was saved.");
  }
  save(name);
}

/** Makes a saved login active. With no name, switches to the other one of exactly two. */
export function use(name) {
  const login = currentLogin();
  assertNotUnsaved(login);
  const target = name ?? otherProfile(login);
  validateName(target);
  assertExists(target);
  link(target);
  return target;
}

function otherProfile(login) {
  const profiles = listProfiles();
  if (login.state !== LoginState.PROFILE || profiles.length !== 2) {
    throw new UserError(`Name the login to use. Saved: ${profiles.join(", ") || "none"}.`);
  }
  return profiles.find((profile) => profile !== login.profile);
}
