import { Command } from "commander";
import { findMissingReadmes } from "./rules.js";

const program = new Command("repo-lint")
  .argument("[dir]", "directory to lint", ".")
  .action((dir: string) => {
    const missing = findMissingReadmes(dir);
    if (missing.length > 0) {
      console.error(`missing READMEs in: ${missing.join(", ")}`);
      process.exit(1);
    }
    console.log("repo looks good");
  });

program.parse();
