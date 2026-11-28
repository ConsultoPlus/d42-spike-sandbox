import { createApp } from "./app.js";
import { openStore } from "./store.js";

const port = Number(process.env.PORT ?? 3000);
let store;
try {
  store = await openStore(process.env);
} catch (err) {
  // Message only: never print DATABASE_URL or anything built from it.
  console.error(`cannot open the store: ${err.message}`);
  process.exit(1);
}
createApp(store).listen(port, () => console.log(`notes API on http://localhost:${port}`));
