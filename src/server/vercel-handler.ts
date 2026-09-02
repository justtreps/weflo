import { createApp } from "./app";
import { prodDeps } from "./prod";
import { createVercelWebHandler } from "./vercel-web";

const app = createApp(prodDeps());

export default createVercelWebHandler(app);
