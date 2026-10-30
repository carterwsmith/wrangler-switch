#!/usr/bin/env node
import { add, currentLogin, listProfiles, LoginState, save, use, UserError } from "../src/profiles.js";

const Command = Object.freeze({
  LIST: "list",
  SAVE: "save",
  ADD: "add",
  USE: "use",
  HELP: "help",
});

const USAGE = `wsw - keep several wrangler logins and switch between them

  wsw                        list saved logins (* = active)
  wsw save <name>            save the login wrangler is using now as <name>
  wsw add <name> [flags]     run \`wrangler login\` for another account and save it as <name>
                             (flags go to wrangler login, e.g. --browser=false)
  wsw use [name]             switch to <name>, or to the other login if you have two`;

function requireName(name, command) {
  if (!name) {
    throw new UserError(`Usage: wsw ${command} <name>`);
  }
  return name;
}

function printList() {
  const login = currentLogin();
  const profiles = listProfiles();
  for (const profile of profiles) {
    const marker = login.state === LoginState.PROFILE && login.profile === profile ? "*" : " ";
    console.log(`${marker} ${profile}`);
  }
  if (login.state === LoginState.UNSAVED) {
    console.log("wrangler has a login that isn't saved yet. Run `wsw save <name>` to keep it.");
  } else if (profiles.length === 0) {
    console.log("No saved logins. Run `wsw save <name>` or `wsw add <name>`.");
  }
}

function run([command = Command.LIST, name, ...rest]) {
  switch (command) {
    case Command.LIST:
      printList();
      break;
    case Command.SAVE:
      save(requireName(name, command));
      console.log(`Saved the current login as "${name}".`);
      break;
    case Command.ADD:
      add(requireName(name, command), rest);
      console.log(`Saved the new login as "${name}". It is now active.`);
      break;
    case Command.USE:
      console.log(`Now using "${use(name)}".`);
      break;
    case Command.HELP:
    case "--help":
    case "-h":
      console.log(USAGE);
      break;
    default:
      throw new UserError(`Unknown command "${command}".\n\n${USAGE}`);
  }
}

try {
  run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof UserError)) {
    throw error;
  }
  console.error(`wsw: ${error.message}`);
  process.exitCode = 1;
}
