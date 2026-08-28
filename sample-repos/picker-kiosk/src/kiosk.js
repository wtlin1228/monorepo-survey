import { arrowRight } from "@acme/icons";
import { fetchWithRetry } from "@acme/http-client";

document.body.dataset.ready = "true";
document.body.insertAdjacentHTML("beforeend", arrowRight);

fetchWithRetry("/api/next-pick", { retries: 3, baseDelayMs: 500 }).catch(() => {
  document.body.dataset.offline = "true";
});
