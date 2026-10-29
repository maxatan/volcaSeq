import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(HERE, "sequenceur.html"), "utf8");
const css = page.match(/<style>([\s\S]*?)<\/style>/)[1];
const inner = page.match(/<main class="iso-page">([\s\S]*)<\/main><script/)[1];
const script = page.match(/<script type="module">([\s\S]*)<\/script>/)[1];
const inlineStyle = inner.match(/^<style>([\s\S]*?)<\/style>/);
const theme = `const root = document.documentElement, body = document.body;
body.classList.add("iso");
const apply = () => { const t = root.dataset.theme; const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; body.dataset.theme = dark ? "dark" : "light"; };
apply();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);
new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
`;
const out = `<title>Séquenceur Volca</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}
body:not(.iso){background:#f3f4f1}
@media (prefers-color-scheme: dark){body:not(.iso){background:#0b0b0b}}
body{padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));padding-block:24px}
.iso-page{margin:24px auto 48px}
</style>
<main class="iso-page">${inner}</main>
<script type="module">${theme}${script}</script>
`;
writeFileSync(join(HERE, "artifact.html"), out);
console.log("wrote artifact.html", out.length);
