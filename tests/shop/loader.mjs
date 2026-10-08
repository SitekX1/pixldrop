// Node-Lader: transpiliert .ts mit dem vorhandenen TypeScript-Compiler und loest den
// Alias "@/..." sowie Imports ohne Dateiendung auf. Nur fuer Tests, nicht fuer den Build.
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function istDatei(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return nextResolve("next/server.js", context);
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  let ziel = null;
  if (specifier.startsWith("@/")) ziel = path.join(root, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    ziel = fileURLToPath(new URL(specifier, context.parentURL));
  }
  if (ziel) {
    for (const kandidat of [ziel, ziel + ".ts", path.join(ziel, "index.ts")]) {
      if (istDatei(kandidat)) return { url: pathToFileURL(kandidat).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".ts")) {
    const quelle = await readFile(fileURLToPath(url), "utf8");
    const { outputText } = ts.transpileModule(quelle, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
      fileName: fileURLToPath(url),
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
