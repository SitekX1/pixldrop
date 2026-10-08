// Registriert den kleinen TypeScript-Lader fuer die Shop-Tests (ohne zusaetzliche Pakete).
// Aufruf: npm run test:shop
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
