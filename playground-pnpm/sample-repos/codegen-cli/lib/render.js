const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

function renderTemplate(templateName, context) {
  const file = path.join(__dirname, "..", "templates", `${templateName}.hbs`);
  const source = fs.readFileSync(file, "utf8");
  return handlebars.compile(source)(context);
}

module.exports = { renderTemplate };
