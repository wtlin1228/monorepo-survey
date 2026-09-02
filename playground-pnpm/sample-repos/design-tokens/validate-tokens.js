const fs = require("fs");
const tokens = JSON.parse(fs.readFileSync("tokens/color.json", "utf8"));
if (!tokens.color?.brand?.primary?.value) {
  console.error("missing primary brand color");
  process.exit(1);
}
console.log("tokens valid");
