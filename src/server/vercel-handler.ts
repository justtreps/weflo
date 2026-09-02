import { createApp } from "./app";
import { prodDeps } from "./prod";
import { createVercelNodeHandler } from "./vercel-node";

const app = createApp(prodDeps());

export default createVercelNodeHandler(app);
