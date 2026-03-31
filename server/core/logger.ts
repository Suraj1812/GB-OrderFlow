import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.DEBUG_MODE ? "debug" : env.LOG_LEVEL,
  base: {
    service: "gb-orderflow-api",
    environment: env.NODE_ENV,
    debugMode: env.DEBUG_MODE,
  },
});
