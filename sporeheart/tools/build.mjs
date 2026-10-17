// SPOREHEART build: concatenates src/*.js + vendor three into ONE html file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => fs.readFileSync(path.join(root, p), "utf8");
import { readdirSync } from "node:fs";
const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const opt = (n) => { const a = argv.find((x) => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : null; };
const GALLERY = flag("gallery");
const charFiles = readdirSync(path.join(root, "src")).filter((f) => /^char_.*\.js$/.test(f)).sort().map((f) => f.replace(/\.js$/, ""));
const ORDER_FULL = ["core", "assets", "render", "charakit", "characters", "villains", "world", "vfx", "debris", "combat", "player", "boss", "audio", "ui", "game"];
const ORDER_GALLERY = ["core", "assets", "render", "charakit", "characters", ...charFiles, "_gallery"];
if (!GALLERY) ORDER_FULL.splice(ORDER_FULL.indexOf("characters") + 1, 0, ...charFiles);
const ORDER = GALLERY ? ORDER_GALLERY : ORDER_FULL;
const head = rd("src/_head.html");
let out = head.replace("</body>", "").replace("</html>", "");
for (const m of ORDER) {
  let code = rd(`src/${m}.js`);
  if (/^char_/.test(m)) {       // agents edit these live — never let a half-written file break the build
    try { new Function(code); } catch (e) { console.warn("SKIPPING " + m + " (syntax error: " + e.message + ")"); continue; }
  }
  code = code.replace(/@@IMG:([a-z0-9_]+)@@/g, (_, n) => {
    const f = path.join(root, `refs/${n}.jpg`);
    return `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`;
  });
  if (code.includes("</script")) throw new Error(m + " contains </script");
  out += `<script>\n/* ===== src/${m}.js ===== */\n${code}\n</script>\n`;
}
const three = rd("vendor/three.module.js");
if (three.includes("</script")) throw new Error("three contains </script");
out += `<script id="three-module" type="text/plain">\n${three}\n</script>\n`;
out += `<script>\n${rd(GALLERY ? "src/_gallery_boot.js" : "src/_boot.js")}\n</script>\n</body>\n</html>\n`;
if (flag("dev")) {
  const dev = rd("src/_dev.js");
  out = out.replace('<script id="three-module"', `<script>\n${dev}\n</script>\n<script id="three-module"`);
}
const dest = opt("out") ? path.resolve(opt("out")) : path.join(root, flag("dev") ? "SPOREHEART.dev.html" : GALLERY ? "gallery.html" : "SPOREHEART.html");
fs.writeFileSync(dest, out);
console.log("built", dest, (out.length / 1048576).toFixed(2) + " MB");
