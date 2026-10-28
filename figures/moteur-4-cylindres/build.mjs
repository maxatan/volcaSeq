import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as E from "./engine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "..", "..", ".claude", "skills", "anatomy");
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 680;
const HEIGHT = 450;

const PLATE = { x: -124, y: -46, w: 246, d: 90, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const WALL_Y = -34;
const WALL_T = 10;
const CUT_Y = 0;
const HEAD_TOP = 196;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-112, 0, 90], [104, 0, 90], [-100, -34, HEAD_TOP + 2], [100, -34, HEAD_TOP + 2], [0, 20, 30]],
  WIDTH,
  HEIGHT,
  { pad: 12, azimuth: 58 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const axisFrame = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const shaft = (x0, x1, y, z, r, tone = "mid", steps) => S(G.disc(0, x1 - x0, r, axisFrame(x0, y, z), P, steps ? { steps } : {}), { tone, crease: "lo" });
const group = (id, children = "", extra = "") => `<g id="${id}"${extra}>${children}</g>`;

// ------------------------------------------------------------------ base
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: -108, y: 24, w: 60, d: 12, r: 1.4 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 4.2], [label.x + 38, label.y + 4.2], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 7.6], [label.x + 24, label.y + 7.6], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + 6, 0.8]), at([label.x + label.w - 3, label.y + 6, 0.8])], { size: 0.45 }));
  const strip = { x: 6, y: 27, w: 100, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  for (const x of [-84, -28, 28, 84]) {
    const mount = { x: x - 9, y: -40, w: 18, d: 12, r: 2 };
    out.push(S(k.slabOf(mount, 0, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([x - 5, -34, 6]), at([x + 5, -34, 6])], { size: 0.45 }));
  }
  return out.join("");
}

function pan() {
  const out = [];
  const floor = { x: -92, y: WALL_Y, w: 184, d: 48, r: 3 };
  out.push(S(k.slabOf(floor, 0, 12, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(floor, 5), 12, P, 4), { tone: "faint" }));
  const sump = { x: -60, y: -26, w: 120, d: 34, r: 4 };
  out.push(L(k.planOutline(sump, 12, P, 4), { tone: "lo" }));
  out.push(D(k.corners(floor, 4).map(([x, y]) => at([x, y, 12])), { size: 0.5 }));
  const plug = G.frameOf([0, floor.y + floor.d, 6], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 2.4, 4.4, plug, P), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(plug, 2.4, 2.4, P, 6), { tone: "lo" }));
  return out.join("");
}

function flywheelBody() {
  const F = axisFrame(E.FLY_X[0], 0, E.ZC);
  const s = E.FLY_X[1] - E.FLY_X[0];
  const out = [];
  out.push(S(G.disc(0, s, 26, F, P, { steps: 64, bevel: 0.8 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(F, s, 22.5, P, 56), { tone: "lo" }));
  out.push(L(G.circleOf(F, s, 15, P, 40), { tone: "faint" }));
  out.push(S(G.disc(s, s + 3, 6.6, F, P, { steps: 24 }), { tone: "mid" }));
  return out.join("") + group("fly", "");
}

// ------------------------------------------------------------------ block and head frame
function backWalls() {
  const out = [];
  const wall = { x: -92, y: WALL_Y, w: 184, d: WALL_T, r: 2 };
  out.push(S(k.slabOf(wall, 12, E.DECK - 12, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(wall, 26, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(wall, E.DECK, HEAD_TOP - E.DECK, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(wall, 186, P, 3), { tone: "faint" }) }));
  return out.join("");
}

function rib(index) {
  const xb = E.XB[index];
  const out = [];
  out.push(S(k.slabOf({ x: xb - E.RIB, y: WALL_Y, w: 2 * E.RIB, d: WALL_T + 24, r: 1.2 }, 12, E.DECK - 12, P, 3, 0.5), { tone: "mid" }));
  // crank bearing: an arm with a cap bolted on
  out.push(S(k.slabOf({ x: xb - E.RIB, y: WALL_Y, w: 2 * E.RIB, d: 47, r: 1.5 }, E.ZC - 12, 24, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: xb - E.RIB - 1, y: 4, w: 2 * E.RIB + 2, d: 9, r: 1.5 }, E.ZC - 12, 24, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(D([at([xb - 2, 8.5, E.ZC + 12]), at([xb + 2, 8.5, E.ZC + 12])], { size: 0.5 }));
  // head wall with a cam bearing
  out.push(S(k.slabOf({ x: xb - E.RIB, y: WALL_Y, w: 2 * E.RIB, d: WALL_T + 24, r: 1.2 }, E.DECK, HEAD_TOP - E.DECK, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: xb - E.RIB, y: WALL_Y + WALL_T, w: 2 * E.RIB, d: 24, r: 1.5 }, E.ZCAM - 7, 14, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(D([at([xb - 2, E.CAM_Y + 6, E.ZCAM + 7]), at([xb + 2, E.CAM_Y + 6, E.ZCAM + 7])], { size: 0.5 }));
  out.push(D([at([xb, WALL_Y + 4, E.DECK - 3]), at([xb, WALL_Y + 4, 20])], { size: 0.5 }));
  return out.join("");
}

function roof(index) {
  const x0 = E.XB[index] + E.RIB;
  const plan = { x: x0, y: WALL_Y, w: E.XB[index + 1] - E.RIB - x0, d: -WALL_Y + CUT_Y, r: 1.4 };
  const out = [];
  out.push(S(k.slabOf(plan, E.DECK, E.ROOF - E.DECK, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan, E.ROOF, E.ROOF_TOP - E.ROOF, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), E.ROOF_TOP, P, 3), { tone: "faint" }));
  return out.join("");
}

function plug(index) {
  const x = E.XS[index];
  const y = -3.5;
  const out = [];
  out.push(S(k.cylinder(x, y, 3.3, E.ROOF_TOP, 4, P, 6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.3, E.ROOF_TOP + 4, 18, P, 18), { tone: "hi", crease: "none" }));
  [8, 12, 16].forEach((up) => out.push(L(k.sideArc(x, y, 2.3, E.ROOF_TOP + 4 + up, P, 12), { tone: "lo" })));
  out.push(S(k.cylinder(x, y, 3.2, E.ROOF_TOP + 22, 10, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 3.2, E.ROOF_TOP + 26, P, 14), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 1.2, E.ROOF_TOP + 32, 2.6, P, 10), { tone: "hi", crease: "none" }));
  return out.join("");
}

function liner(x) {
  const bottom = 62;
  const arc = (z) => k.onTop(Array.from({ length: 25 }, (_, step) => [x + E.BORE_R * Math.cos(Math.PI + (step / 24) * Math.PI), E.BORE_R * Math.sin(Math.PI + (step / 24) * Math.PI)]), z, P);
  const sides = [-E.BORE_R, E.BORE_R].map((dx) => k.rise([x + dx, 0], bottom, E.DECK, P)).join("");
  return L(arc(E.DECK) + arc(bottom) + sides, { tone: "lo" }) + L(arc(96) + arc(80), { tone: "faint", free: true });
}

function cylinderBlock(index) {
  const x = E.XS[index];
  const xl = E.XB[index] + E.RIB;
  const xr = E.XB[index + 1] - E.RIB;
  const out = [];
  out.push(shaft(xl, xr, 0, E.ZC, 6, "mid", 24));
  out.push(liner(x));
  out.push(group(`far-${index}`));
  out.push(group(`rod-${index}`));
  out.push(group(`piston-${index}`, E.pistonSvg(P, index)));
  out.push(group(`gas-${index}`));
  out.push(group(`near-${index}`));
  out.push(shaft(xl, xr, E.CAM_Y, E.ZCAM, 4.2, "mid", 20));
  E.VALVES.filter((valve) => valve.index === index).forEach((valve, n) => out.push(group(`low-${index}-${n}`, E.valveLowerSvg(P, valve))));
  out.push(roof(index));
  E.VALVES.filter((valve) => valve.index === index).forEach((valve, n) => out.push(group(`up-${index}-${n}`, E.valveUpperSvg(P, valve, 0))));
  E.VALVES.filter((valve) => valve.index === index).forEach((valve, n) => out.push(group(`lobe-${index}-${n}`)));
  out.push(plug(index));
  return out.join("");
}

function body() {
  const out = [plate(), pan()];
  out.push(shaft(E.FLY_X[1], E.XB[0] - E.RIB, 0, E.ZC, 6, "mid", 24));
  out.push(flywheelBody());
  out.push(backWalls());
  for (let index = 0; index < 5; index++) {
    out.push(rib(index));
    if (index < 4) out.push(cylinderBlock(index));
  }
  out.push(shaft(E.XB[4] + E.RIB, E.X_TIMING + 2, 0, E.ZC, 3.4, "mid", 16));
  out.push(shaft(E.XB[4] + E.RIB, E.X_TIMING + 2, E.CAM_Y, E.ZCAM, 3.4, "mid", 16));
  out.push(group("belt"), group("spr-crank"), group("spr-cam"));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un moteur à quatre cylindres en ligne, en coupe. Quatre pistons montent et descendent à tour de rôle, reliés par des bielles à un vilebrequin dont les manetons sont décalés de 180°. Un arbre à cames tourne deux fois moins vite, entraîné par une courroie, et ouvre les soupapes d'admission et d'échappement. L'allumage suit l'ordre 1-3-4-2.",
  body: body(),
});

// ------------------------------------------------------------------ live page
const kitSource = readFileSync(join(SKILL, "kit", "iso-kit.mjs"), "utf8");
const kitNames = [...kitSource.matchAll(/^export (?:function|const) (\w+)/gm)].map((match) => match[1]);
const kitObject = `const k = { ${kitNames.join(", ")} };\n`;
const latheSource = readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheNames = [...readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map((match) => match[1]);
const latheScript = `const G = (() => {${latheSource}\nreturn { ${latheNames.join(", ")} };})();\n`;
const engineScript = readFileSync(join(HERE, "engine.mjs"), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__P__", JSON.stringify(P));

const html = k.plateHtml({
  fig: "Fig 1",
  title: "Moteur 4 temps, 4 cylindres",
  hint: "Glisser pour tourner le vilebrequin",
  readout: E.readoutOf(0),
  keys: [
    { mark: "lit", label: "La flamme : le cylindre qui est en combustion" },
    { mark: "raised", label: "Quatre pistons, un maneton chacun, deux à deux en opposition" },
    { mark: "dotted", label: "Le mélange admis, comprimé puis chassé" },
  ],
  caption:
    "Moteur essence 1,6 L, alésage et course de 80 mm, rapport volumétrique 10:1. Chaque cylindre passe par admission, compression, combustion et échappement en deux tours de vilebrequin, un tour d'arbre à cames. Les manetons 1 et 4 montent quand 2 et 3 descendent, et l'allumage tourne dans l'ordre 1-3-4-2 : une combustion tous les 180°.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Moteur 4 cylindres : glisser ou flèches gauche et droite pour tourner le vilebrequin, haut et bas pour changer la vitesse, espace pour arrêter" aria-valuemin="0" aria-valuemax="719" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "moteur-light.html" : "moteur.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Moteur 4 cylindres", theme, body: html, script: kitScript() + "\n" + kitObject + latheScript + engineScript + live, width: 760 }));
console.log("wrote", name);
