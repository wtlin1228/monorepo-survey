const fs = require("fs");
const path = require("path");
const svgDir = path.join(__dirname, "..", "svg");
for (const f of fs.readdirSync(svgDir)) {
  const content = fs.readFileSync(path.join(svgDir, f), "utf8");
  if (!content.includes("viewBox")) {
    console.error(`${f}: missing viewBox`);
    process.exit(1);
  }
}
console.log("all svgs valid");
