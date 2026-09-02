const url = process.env.API_URL ?? "http://localhost:8080";
const deadline = 60;

async function main() {
  for (let i = 0; i < deadline; i++) {
    try {
      const res = await fetch(`${url}/healthz`);
      if (res.ok) {
        console.log("api is up");
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error("api never became healthy");
  process.exit(1);
}

main();
