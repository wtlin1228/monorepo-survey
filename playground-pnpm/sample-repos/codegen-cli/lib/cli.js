#!/usr/bin/env node
const { renderTemplate } = require("./render");

const [, , templateName, name] = process.argv;
if (!templateName || !name) {
  console.error("usage: acme-codegen <template> <Name>");
  process.exit(2);
}
process.stdout.write(renderTemplate(templateName, { name }));
