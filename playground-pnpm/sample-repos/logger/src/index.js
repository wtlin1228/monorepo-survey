const LEVELS = ["debug", "info", "warn", "error"];

export function createLogger(minLevel = "info") {
  const threshold = LEVELS.indexOf(minLevel);
  return Object.fromEntries(
    LEVELS.map((level, i) => [
      level,
      (msg, fields = {}) => {
        if (i < threshold) return;
        process.stdout.write(JSON.stringify({ level, msg, ...fields }) + "\n");
      },
    ])
  );
}
