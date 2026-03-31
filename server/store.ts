import fs from "node:fs";
import path from "node:path";

import { createSeedDatabase } from "./seed.js";
import type { Database } from "./types.js";

const storageDirectory = path.resolve(process.cwd(), "server/storage");
const dbFilePath = path.join(storageDirectory, "db.json");

function ensureStorageDirectory() {
  fs.mkdirSync(storageDirectory, { recursive: true });
}

function writeJsonFile(database: Database) {
  const tempPath = `${dbFilePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(database, null, 2), "utf-8");
  fs.renameSync(tempPath, dbFilePath);
}

export function ensureDatabase() {
  ensureStorageDirectory();

  if (!fs.existsSync(dbFilePath)) {
    writeJsonFile(createSeedDatabase());
  }
}

export function readDatabase(): Database {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(dbFilePath, "utf-8")) as Database;
}

export function writeDatabase(database: Database) {
  ensureStorageDirectory();
  writeJsonFile(database);
}

export function updateDatabase<T>(updater: (database: Database) => T): T {
  const database = readDatabase();
  const result = updater(database);
  writeDatabase(database);
  return result;
}

