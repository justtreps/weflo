import { handle } from "hono/vercel";
import { createApp } from "../src/server/app";
import { prodDeps } from "../src/server/prod";

export default handle(createApp(prodDeps()));
