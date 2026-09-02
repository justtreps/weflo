import { serve } from "@hono/node-server";
import { createApp } from "./server/app";
import { prodDeps } from "./server/prod";

const port = Number(process.env.PORT || 3000);
serve({ fetch: createApp(prodDeps()).fetch, port });
console.log(`Weflo local: http://localhost:${port}`);
