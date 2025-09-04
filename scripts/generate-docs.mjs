// scripts/generate-docs.mjs
// Rebuilds WARP.md and README.md from docs/index.yaml + component docs.
// Usage: node scripts/generate-docs.mjs
// Dev deps: js-yaml (npm i -D js-yaml)
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const IDX = path.join(DOCS, "index.yaml");
if (!fs.existsSync(IDX)) {
  console.error("Missing docs/index.yaml");
  process.exit(2);
}

const index = yaml.load(fs.readFileSync(IDX, "utf8"));
function read(rel) {
  const p = path.join(DOCS, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing document: ${rel}`);
  return fs.readFileSync(p, "utf8").trim();
}

function buildWarp() {
  let out = `# WARP.md — Operational Rules
> Fonte: docs/index.yaml (version ${index.version || "1"}) — generato automaticamente

`;
  const sections = index.warp_extract?.sections || [];
  for (const sec of sections) {
    out += `\n## ${sec.heading}\n`;
    for (const inc of sec.includes || []) {
      const body = read(inc);
      out += `\n<!-- BEGIN:${inc} -->\n${body}\n<!-- END:${inc} -->\n`;
    }
  }
  return out.trim() + "\n";
}

function buildReadme() {
  let out = `# ${index.title || "Project Operational Index"}\n\n`;
  if (index.readme_toc?.intro) {
    out += index.readme_toc.intro + "\n\n";
  } else {
    out += "Questa repository usa documentazione modulare governata da `docs/index.yaml`.\n\n";
  }
  out += "## Documenti chiave\n";
  for (const f of index.priority || []) {
    out += `- [${f}](/docs/${f})\n`;
  }
  const runs = (index.warp_extract?.sections || []).find(s => s.heading?.toLowerCase().includes("runbook"));
  if (runs) {
    out += `\n## Runbook rapidi\n`;
    for (const f of runs.includes || []) {
      out += `- [${f}](/docs/${f})\n`; 
    }
  }
  const originalPath = path.join(DOCS, "source", "README.md");
  out += `\n---\n\n## Appendice — README originale\n`;
  if (fs.existsSync(originalPath)) {
    out += fs.readFileSync(originalPath, "utf8").trim() + "\n";
  } else {
    out += "_(Non disponibile in docs/source/README.md)_\n";
  }
  return out;
}

fs.writeFileSync(path.join(ROOT, "WARP.md"), buildWarp(), "utf8");
fs.writeFileSync(path.join(ROOT, "README.md"), buildReadme(), "utf8");
console.log("[ok] Generated WARP.md and README.md from docs/index.yaml");
