import { getRequestListener } from "@hono/node-server";
import { createApp } from "./app";
import { prodDeps } from "./prod";

const app = createApp(prodDeps());

export default getRequestListener(app.fetch);
