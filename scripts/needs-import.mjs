// Exit 1 when data/pisoscan.db is missing or older than any source file or the importer.
import { existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
const db = path.resolve("data", "pisoscan.db");
if (!existsSync(db)) process.exit(1);
const t = statSync(db).mtimeMs;
const inputs = [...readdirSync("data").filter((f) => /\.(json|gz)$/.test(f)).map((f) => path.join("data", f)), "scripts/import.mjs"];
process.exit(inputs.some((f) => statSync(f).mtimeMs > t) ? 1 : 0);
