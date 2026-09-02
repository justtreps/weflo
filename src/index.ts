import { Hono } from "hono";
import { createApp } from "./server/app";
import { prodDeps } from "./server/prod";

const app: Hono = createApp(prodDeps());

export default app;
