import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const pkg: { name: string; version: string } = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8"),
);
