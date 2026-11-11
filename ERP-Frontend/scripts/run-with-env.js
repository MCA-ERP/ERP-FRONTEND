#!/usr/bin/env node
/**
 * Runs a command with one environment's settings loaded from env/.env.<name>.
 *
 *   node scripts/run-with-env.js <dev|uat|preprod|prod> -- <command...>
 *
 * Normally you use the npm scripts instead, for example:
 *   npm run dev:uat        start the site with the UAT settings
 *   npm run build:prod     build the site with the production settings
 *   npm run start:prod     serve that build
 *
 * NEXT_PUBLIC_* values are baked into the build, so build and start with the same environment.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ENVS = ["dev", "uat", "preprod", "prod"];
const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_API_URL"];

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** KEY=value lines; # comments, blank lines and "quoted values" are understood. */
function parse(text) {
  const out = {};
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    out[key] = value;
  }
  return out;
}

const args = process.argv.slice(2);
const name = args[0];
const split = args.indexOf("--");
const command = split === -1 ? [] : args.slice(split + 1);

if (!ENVS.includes(name)) fail(`Choose an environment: ${ENVS.join(", ")}. Example: npm run dev:uat`);
if (!command.length) fail("Nothing to run. Use the npm scripts, for example: npm run dev:" + name);

const root = path.join(__dirname, "..");
const file = path.join(root, "env", `.env.${name}`);
if (!fs.existsSync(file)) {
  fail(`env/.env.${name} does not exist.\nCreate it from the template:  copy env\\.env.${name}.example env\\.env.${name}   (then fill in the values)`);
}

const values = parse(fs.readFileSync(file, "utf8"));
const missing = REQUIRED.filter((k) => !values[k]);
if (missing.length) fail(`env/.env.${name} is missing: ${missing.join(", ")}`);

if (values.SUPABASE_SERVICE_ROLE_KEY) fail(`env/.env.${name} contains SUPABASE_SERVICE_ROLE_KEY. The website must never have it: it bypasses all database security. Remove the line.`);

if (name !== "dev") {
  const problems = [];
  if (!/^https:/i.test(values.NEXT_PUBLIC_API_URL)) problems.push("NEXT_PUBLIC_API_URL must be an https address");
  if (/localhost|127\.0\.0\.1/i.test(values.NEXT_PUBLIC_API_URL)) problems.push("NEXT_PUBLIC_API_URL still points at localhost");
  if (/example\.supabase\.co/i.test(values.NEXT_PUBLIC_SUPABASE_URL)) problems.push("NEXT_PUBLIC_SUPABASE_URL is still the placeholder");
  if (problems.length) fail(`env/.env.${name} is not ready for a live environment:\n  - ${problems.join("\n  - ")}`);
}

const stray = [".env", ".env.local"].filter((f) => fs.existsSync(path.join(root, f)));
if (stray.length) {
  console.warn(`⚠ ${stray.join(" and ")} also exist${stray.length === 1 ? "s" : ""}. Settings missing from env/.env.${name} fall back to them. Delete them once you no longer need them.`);
}

// the chosen file wins over anything already set in the shell
for (const [k, v] of Object.entries(values)) process.env[k] = v;
process.env.APP_ENV = name;

console.log(`▶ Environment: ${name.toUpperCase()}  (${path.relative(root, file)})  ·  ${Object.keys(values).length} settings loaded`);
console.log(`  API = ${values.NEXT_PUBLIC_API_URL}`);

const child = spawn(command.join(" "), { cwd: root, stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
