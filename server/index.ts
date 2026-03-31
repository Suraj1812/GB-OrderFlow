import "dotenv/config";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
    },
    "GB OrderFlow API listening",
  );
});
