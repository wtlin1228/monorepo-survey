import { build } from "esbuild";
import { writeFileSync } from "node:fs";

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "dist",
  minify: process.env.NODE_ENV === "production",
});

writeFileSync(
  "dist/index.d.ts",
  `export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFn = (msg: string, fields?: Record<string, unknown>) => void;
export function createLogger(minLevel?: LogLevel): Record<LogLevel, LogFn>;
`
);
console.log("logger built");
