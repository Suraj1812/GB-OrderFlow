import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "gb-orderflow-api",
    environment: env.NODE_ENV,
  },
});

