const fs = require("fs");
const path = require("path");

const svgDir = path.join(__dirname, "..", "svg");
const outDir = path.join(__dirname, "..", "dist");
fs.mkdirSync(outDir, { recursive: true });

const exports_ = fs
  .readdirSync(svgDir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => {
    const name = path.basename(f, ".svg").replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const svg = fs.readFileSync(path.join(svgDir, f), "utf8").trim();
    return `export const ${name} = ${JSON.stringify(svg)};`;
  });

fs.writeFileSync(path.join(outDir, "index.js"), exports_.join("\n") + "\n");
console.log(`generated ${exports_.length} icons`);
