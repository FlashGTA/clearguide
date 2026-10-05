#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateManifest() {
  const manifest = parseJson("manifest.json");

  assert(manifest.manifest_version === 3, "manifest_version must be 3");
  assert(/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version), "manifest version must be numeric");
  assert(!manifest.host_permissions, "required host_permissions must not be declared");
  assert(!manifest.content_scripts, "static content_scripts must not be declared");

  const permissions = new Set(manifest.permissions || []);
  for (const required of ["storage", "activeTab", "scripting"]) {
    assert(permissions.has(required), `missing required permission: ${required}`);
  }

  assert(!permissions.has("tabs"), "tabs should not be required while activeTab + granted hosts are sufficient");

  const optionalHosts = new Set(manifest.optional_host_permissions || []);
  assert(optionalHosts.has("http://*/*"), "missing optional HTTP host permission");
  assert(optionalHosts.has("https://*/*"), "missing optional HTTPS host permission");
}

function validateGuideContract() {
  const schema = parseJson("schema/guide.schema.json");
  const guide = parseJson("examples/guides/basic-guide.json");

  assert(schema.title === "ClearGuide Guide Template", "unexpected guide schema");
  assert(guide.schemaVersion === "1.0", "example guide must use schemaVersion 1.0");
  assert(typeof guide.id === "string" && guide.id.length > 0, "example guide id required");
  assert(typeof guide.name === "string" && guide.name.length > 0, "example guide name required");
  assert(Array.isArray(guide.steps) && guide.steps.length > 0, "example guide steps required");

  for (const [index, step] of guide.steps.entries()) {
    assert(typeof step.message === "string" && step.message.length > 0, `step ${index + 1}: message required`);
    assert(typeof step.urlPattern === "string" && step.urlPattern.length > 0, `step ${index + 1}: urlPattern required`);
  }
}

function validatePlayerBoundary() {
  const player = read("sdk/clearguide-player.js");

  assert(player.includes("playFromUrl"), "Player must expose playFromUrl()");
  assert(!/\bchrome\./.test(player), "Player must not depend on Chrome Extension APIs");
  assert(!/\beval\s*\(/.test(player), "Player must not use eval()");
  assert(!/new\s+Function\s*\(/.test(player), "Player must not use new Function()");
}

function validateExtensionBoundary() {
  const runtimeFiles = [
    "src/background/index.js",
    "src/content/index.js",
    "public/popup.js"
  ];

  for (const file of runtimeFiles) {
    const source = read(file);
    assert(!/\beval\s*\(/.test(source), `${file}: eval() is prohibited`);
    assert(!/new\s+Function\s*\(/.test(source), `${file}: new Function() is prohibited`);
    assert(!/https?:\/\/[^"'\s]+\.js(?:[?"'\s]|$)/i.test(source), `${file}: remote executable JavaScript reference found`);
  }
}

function validateReleaseDocs() {
  for (const file of [
    "README.md",
    "CHROMEWEBSTORE.md",
    "PRIVACY.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "RELEASE_CHECKLIST.md"
  ]) {
    assert(fs.existsSync(path.join(root, file)), `missing release document: ${file}`);
  }
}

validateManifest();
validateGuideContract();
validatePlayerBoundary();
validateExtensionBoundary();
validateReleaseDocs();

console.log("ClearGuide release validation: PASS");
