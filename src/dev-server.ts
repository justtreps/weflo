import { serve } from "@hono/node-server";
import { createApp } from "./server/app";
import { prodDeps } from "./server/prod";

serve({ fetch: createApp(prodDeps()).fetch, port: 3000 });
