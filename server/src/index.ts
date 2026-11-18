import { getConfig } from "./config";
import { systemClock } from "./clock";
import { createApp, createPool } from "./app";

const { apiPort, databaseUrl } = getConfig();
const pool = createPool(databaseUrl);
const clock = systemClock;
const app = createApp({ pool, clock });

app.listen(apiPort, () => {
  console.log(`API listening on port ${apiPort}`);
});