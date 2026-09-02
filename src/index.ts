import { createApp } from "./server/app";
import { prodDeps } from "./server/prod";

const app = createApp(prodDeps());

export default app;
