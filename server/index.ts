import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";

import { createRouter } from "./routes.js";
import { ensureDatabase } from "./store.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

ensureDatabase();

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());
app.use(express.json({ limit: "200kb" }));
app.use("/api", createRouter());

const clientDistPath = path.resolve(process.cwd(), "dist");

if (process.env.NODE_ENV === "production" && fs.existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath, {
      index: false,
      setHeaders(response, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
      },
    }),
  );

  app.get("/{*path}", (_request, response) => {
    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`GB OrderFlow API listening on http://localhost:${port}`);
});
