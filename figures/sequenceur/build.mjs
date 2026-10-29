import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 700;
const HEIGHT = 430;

// ------------------------------------------------------------------ the world (1 unit ≈ 1 mm)
const BOX = { x: -150, y: -95, w: 300, d: 190, r: 12 };
const BOX_H = 30;
const FOOT_H = 4;
const DECK = BOX_H;
const TILT = (22 * Math.PI) / 180;
const WEDGE = { x0: -141, x1: 21, yFront: -8, yBack: -90 };
const BEZEL = { x: -135, w: 150, h: 88, t: 5 };
const GLASS = { inset: 8, w: 134, h: 72 };
const OLED = { x: 46, y: -86, w: 84, d: 52, r: 4, h: 6 };
const PAD_FRAME = { x: -142, y: 10, w: 77, d: 77, r: 4 };
const PAD = 15;
const PITCH = 18;
const PAD_Z = DECK + 3;
const PAD_H = 4;
const KNOBS = [-30, 6, 42, 78].map((x) => [x, 24]);
const BUTTONS = [-30, 6, 42].map((x) => [x, 60]);
const LED = [78, 60];
const STEPS = 16;
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
const FM = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
const DRUM = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];

const u = [1, 0, 0];
const v = [0, -Math.cos(TILT), Math.sin(TILT)];
const n = [0, Math.sin(TILT), Math.cos(TILT)];
const O_BEZEL = [BEZEL.x, WEDGE.yFront, DECK];
const along = (o, vec, s) => [o[0] + vec[0] * s, o[1] + vec[1] * s, o[2] + vec[2] * s];

const P = k.fitProjection(
  [...k.boxCorners(BOX, -FOOT_H, BOX_H), along(along(O_BEZEL, v, BEZEL.h), n, BEZEL.t), along(along(along(O_BEZEL, v, BEZEL.h), n, BEZEL.t), u, BEZEL.w), [152, 0, 0]],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 55, elevation: 32 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const sorted = (items, point) => [...items].sort((a, b) => k.depthOf(point(a), P) - k.depthOf(point(b), P));
const thousand = (value) => Math.round(value * 1000) / 1000;
const planeMatrix = (origin, ux, vy) => {
  const o = at(origin);
  const a = at([origin[0] + ux[0], origin[1] + ux[1], origin[2] + ux[2]]);
  const b = at([origin[0] + vy[0], origin[1] + vy[1], origin[2] + vy[2]]);
  return `matrix(${thousand(a[0] - o[0])} ${thousand(a[1] - o[1])} ${thousand(b[0] - o[0])} ${thousand(b[1] - o[1])} ${thousand(o[0])} ${thousand(o[1])})`;
};

// ------------------------------------------------------------------ box, feet, deck
function chassis() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOX, -FOOT_H, BOX_H + FOOT_H, P)}"/>`];
  const feet = [[-124, -70], [124, -70], [-124, 70], [124, 70]].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 9, -FOOT_H, FOOT_H, P, 28), { tone: "lo" }));
    out.push(L(k.ring(x, y, 5.4, -FOOT_H + 0.01, P, 16), { tone: "faint" }));
  }
  out.push(S(k.slabOf(BOX, 0, BOX_H, P, 10, 1.4), { tone: "mid", inner: L(k.sideSeam(BOX, 20, P, 10), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 6), DECK, P, 8), { tone: "faint" }));
  const screws = k.corners(BOX, 13).filter(([x, y]) => !(x < -100 && y < -60));
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, DECK, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }));
  return out.join("");
}

function sideJacks() {
  const out = [];
  const X = BOX.x + BOX.w;
  // MIDI out: a DIN-5 socket with its five pins
  const din = G.frameOf([X, -30, 15], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 2.2, 9.4, din, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(din, 2.2, 6.4, P, 36), { tone: "lo" }));
  const pins = [0, 45, 90, 135, 180].map((deg) => at([X + 2.2, -30 + 3.9 * Math.cos((deg * Math.PI) / 180), 15 + 3.9 * Math.sin((deg * Math.PI) / 180)]));
  out.push(D(pins, { size: 0.65, tone: "hi" }));
  out.push(L(k.segment([X + 2.2, -30, 21.2], [X + 2.2, -30, 19.4], P), { tone: "mid" }));
  // USB-C power: a slot in a small collar
  const usb = G.frameOf([X, 28, 15], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.prismOf(usb, G.stadium(3.6, 3.6, 9), 0, 1.6, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.prismOf(G.frameOf([X + 1.6, 28, 15], [1, 0, 0], [0, 1, 0], [0, 0, 1]), G.stadium(2.2, 2.2, 8.4), 0, 0.4, P), { tone: "lo", crease: "none" }));
  return out.join("");
}

function labelPlate() {
  const plan = { x: 58, y: 72, w: 76, d: 14, r: 1.6 };
  const out = [S(k.slabOf(plan, DECK, 0.8, P, 4), { tone: "lo", crease: "none" })];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.4), DECK + 0.8, P, 4), { tone: "faint" }));
  out.push(D([at([plan.x + 3.6, plan.y + 3.6, DECK + 0.8]), at([plan.x + plan.w - 3.6, plan.y + 3.6, DECK + 0.8]), at([plan.x + 3.6, plan.y + plan.d - 3.6, DECK + 0.8]), at([plan.x + plan.w - 3.6, plan.y + plan.d - 3.6, DECK + 0.8])], { size: 0.45 }));
  out.push(k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + 9.6], DECK + 0.8, P, "x"), "VOLCASEQ", { size: 6.4, tone: "mid", anchor: "middle" }));
  return out.join("");
}

// ------------------------------------------------------------------ the 7" touch screen on its wedge
const SCREEN_IDS = { head: "scr-head" };
function screen() {
  const out = [];
  const Fx = G.frameOf([WEDGE.x0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const bezelTop = along(O_BEZEL, v, BEZEL.h);
  const wedge = [[WEDGE.yFront, DECK], [WEDGE.yBack, DECK], [WEDGE.yBack, DECK + (BEZEL.h * Math.sin(TILT)) + 0.01]];
  out.push(S(G.prismOf(G.frameOf([WEDGE.x0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), wedge, 0, WEDGE.x1 - WEDGE.x0, P), { tone: "mid", crease: "lo" }));
  const F = G.frameOf(O_BEZEL, n, u, v);
  const rect = [[0, 0], [BEZEL.w, 0], [BEZEL.w, BEZEL.h], [0, BEZEL.h]];
  out.push(S(G.prismOf(F, rect.map(([x, y]) => [x, y]), 0, BEZEL.t, P), { tone: "hi", crease: "lo" }));
  const top = (x, y) => along(along(along(O_BEZEL, u, x), v, y), n, BEZEL.t);
  out.push(D([[5, 5], [BEZEL.w - 5, 5], [5, BEZEL.h - 5], [BEZEL.w - 5, BEZEL.h - 5]].map(([x, y]) => at(top(x, y))), { size: 0.5 }));
  // glass, drawn in the plane of the bezel face: x along the bezel, y down the slope
  const origin = top(GLASS.inset, BEZEL.h - GLASS.inset);
  const matrix = planeMatrix(origin, u, [-v[0], -v[1], -v[2]]);
  out.push(`<g transform="${matrix}" id="scr">${screenContent()}</g>`);
  return out.join("");
}

const CELL = { x0: 32, w: 4.4, gap: 1.4 };
const ROWS = [
  { name: "BASS", y: 17, data: BASS, live: true },
  { name: "FM2", y: 33, data: FM },
  { name: "DRUM", y: 49, data: DRUM },
];
function screenContent() {
  const out = [`<clipPath id="scr-clip"><rect width="${GLASS.w}" height="${GLASS.h}" rx="2"/></clipPath>`, `<g clip-path="url(#scr-clip)">`, `<rect class="scr-glass" width="${GLASS.w}" height="${GLASS.h}"/>`];
  out.push(`<rect class="scr-bar" width="${GLASS.w}" height="11"/>`);
  out.push(`<text class="scr-t" x="5" y="7.6" font-size="6" id="scr-tempo">120 BPM</text>`);
  out.push(`<text class="scr-t dim" x="${GLASS.w - 5}" y="7.6" font-size="6" text-anchor="end">PAT 01</text>`);
  ROWS.forEach((row, r) => {
    out.push(`<text class="scr-t dim" x="5" y="${row.y + 7.4}" font-size="5.2">${row.name}</text>`);
    for (let s = 0; s < STEPS; s++) {
      const x = CELL.x0 + s * (CELL.w + CELL.gap) + (s >= 8 ? 2 : 0) + (s >= 4 && s < 8 ? 1 : 0) + (s >= 12 ? 3 : 0);
      out.push(`<rect class="cell" data-row="${r}" data-s="${s}"${row.data[s] ? " data-on" : ""} x="${x}" y="${row.y}" width="${CELL.w}" height="10" rx="0.8"/>`);
    }
  });
  out.push(`<rect class="scr-head" id="${SCREEN_IDS.head}" x="${CELL.x0 - 1}" y="14" width="${CELL.w + 2}" height="48" rx="1.2"/>`);
  out.push(`<text class="scr-t dim" x="5" y="${GLASS.h - 3.6}" font-size="5.2" id="scr-step">PAS 01/16</text>`);
  out.push(`</g>`);
  return out.join("");
}

// ------------------------------------------------------------------ the small OLED
function oled() {
  const out = [];
  out.push(S(k.slabOf(OLED, DECK, OLED.h, P, 4, 0.6), { tone: "mid" }));
  const top = DECK + OLED.h;
  out.push(D([at([OLED.x + 4, OLED.y + 4, top]), at([OLED.x + OLED.w - 4, OLED.y + 4, top]), at([OLED.x + 4, OLED.y + OLED.d - 4, top]), at([OLED.x + OLED.w - 4, OLED.y + OLED.d - 4, top])], { size: 0.5 }));
  const gx = OLED.x + 8, gy = OLED.y + 8, gw = 68, gh = 36;
  out.push(`<g transform="${k.topMatrix([gx, gy], top, P, "x")}"><clipPath id="oled-clip"><rect width="${gw}" height="${gh}" rx="1.4"/></clipPath><g clip-path="url(#oled-clip)"><rect class="scr-glass" width="${gw}" height="${gh}"/>`);
  out.push(`<text class="scr-t dim" x="4" y="9" font-size="5.4">PAS</text><text class="scr-t big" x="${gw - 4}" y="22" font-size="17" text-anchor="end" id="oled-step">01</text>`);
  for (let s = 0; s < STEPS; s++) out.push(`<rect class="tick" data-s="${s}" x="${4 + s * 3.8}" y="29" width="2.6" height="3.6"/>`);
  out.push(`</g></g>`);
  return out.join("");
}

// ------------------------------------------------------------------ pads
function pads() {
  const out = [];
  out.push(S(k.slabOf(PAD_FRAME, DECK, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PAD_FRAME, 1.6), DECK + 3, P, 4), { tone: "faint" }));
  out.push(D([[PAD_FRAME.x + 2.6, PAD_FRAME.y + 2.6], [PAD_FRAME.x + PAD_FRAME.w - 2.6, PAD_FRAME.y + 2.6], [PAD_FRAME.x + 2.6, PAD_FRAME.y + PAD_FRAME.d - 2.6], [PAD_FRAME.x + PAD_FRAME.w - 2.6, PAD_FRAME.y + PAD_FRAME.d - 2.6]].map(([x, y]) => at([x, y, DECK + 3])), { size: 0.45 }));
  const cells = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) cells.push({ row, col, index: row * 4 + col });
  for (const cell of sorted(cells, (c) => padCentre(c.index))) {
    const plan = padPlan(cell.index);
    const body = S(k.slabOf(plan, PAD_Z, PAD_H, P, 3, 0.5), { tone: "hi", crease: "lo", className: "pad-body" });
    const led = `<path class="iso-line pad-led" data-tone="faint" d="${k.planOutline(k.insetPlan(plan, 3), PAD_Z + PAD_H, P, 3)}"/>`;
    out.push(`<g class="pad" data-pad="${cell.index}"><g class="pad-move">${body}${led}</g></g>`);
  }
  return out.join("");
}
const padPlan = (index) => ({ x: PAD_FRAME.x + 4 + (index % 4) * PITCH, y: PAD_FRAME.y + 4 + Math.floor(index / 4) * PITCH, w: PAD, d: PAD, r: 2.4 });
const padCentre = (index) => {
  const plan = padPlan(index);
  return [plan.x + PAD / 2, plan.y + PAD / 2, PAD_Z];
};

// ------------------------------------------------------------------ knobs and buttons
const KNOB_R = 8;
const KNOB_TOP = DECK + 1.4 + 11;
const knobAngle = (bpm) => ((bpm - 60) / 120) * 270 - 135;
function knobPointer(centre, bpm) {
  const a = (knobAngle(bpm) * Math.PI) / 180;
  return k.lineOnTop([centre[0], centre[1]], [centre[0] + Math.sin(a) * (KNOB_R - 0.5), centre[1] - Math.cos(a) * (KNOB_R - 0.5)], KNOB_TOP, P);
}
function knobs() {
  const out = [];
  for (const [index, centre] of KNOBS.map((c, i) => [i, c])) {
    const [x, y] = centre;
    const parts = [];
    parts.push(S(k.cylinder(x, y, 13, DECK, 1.4, P, 40), { tone: "lo", crease: "lo" }));
    const ticks = k.radialTicks(x, y, 13, 18, 3, DECK + 1.4, [1.6, 3], P, (-135 * Math.PI) / 180, (270 * Math.PI) / 180);
    parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    parts.push(S(k.cylinder(x, y, KNOB_R, DECK + 1.4, 11, P, 36, 0.8), { tone: "hi", crease: "lo" }));
    parts.push(L(k.knurl(x, y, KNOB_R, DECK + 1.4, DECK + 1.4 + 11 - 3, 30, P, 0), { tone: "lo" }));
    parts.push(L(k.sideArc(x, y, KNOB_R, DECK + 1.4 + 8, P, 24), { tone: "faint" }));
    parts.push(`<path class="iso-line" data-free="end" data-tone="${index === 0 ? "lit" : "hi"}" id="knob-${index}" d="${knobPointer(centre, index === 0 ? 120 : [0, 96, 78, 110][index])}" style="stroke-width:1"/>`);
    parts.push(D([at([x, y, KNOB_TOP])], { size: 0.7, tone: index === 0 ? "lit" : "hi" }));
    out.push({ centre, svg: parts.join("") });
  }
  return out;
}

function buttons() {
  return BUTTONS.map(([x, y], index) => {
    const parts = [];
    parts.push(S(k.cylinder(x, y, 8.6, DECK, 1.4, P, 32), { tone: "lo", crease: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, DECK + 1.4, 4.6, P, 32, 0.6), { tone: "hi", crease: "lo", className: "btn-cap" }));
    parts.push(L(k.ring(x, y, 3.6, DECK + 6, P, 20), { tone: "faint" }));
    if (index === 0) parts.push(L(k.lineOnTop([x - 1.6, y - 2], [x - 1.6, y + 2], DECK + 6, P) + k.lineOnTop([x - 1.6, y - 2], [x + 2.4, y], DECK + 6, P) + k.lineOnTop([x - 1.6, y + 2], [x + 2.4, y], DECK + 6, P), { tone: "mid" }));
    if (index === 1) parts.push(L(k.planOutline({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.3 }, DECK + 6, P, 2), { tone: "mid" }));
    if (index === 2) parts.push(L(k.lineOnTop([x - 2.4, y + 1.8], [x, y - 2], DECK + 6, P) + k.lineOnTop([x, y - 2], [x + 2.4, y + 1.8], DECK + 6, P), { tone: "mid" }));
    return { centre: [x, y], svg: index === 0 ? `<g id="btn-play">${parts.join("")}</g>` : parts.join("") };
  });
}

function led() {
  const [x, y] = LED;
  const out = [S(k.cylinder(x, y, 4.4, DECK, 1.2, P, 20), { tone: "lo", crease: "lo" })];
  out.push(`<g id="midi-led">${D([at([x, y, DECK + 1.2])], { size: 1.4, tone: "faint" })}</g>`);
  return out.join("");
}

// ------------------------------------------------------------------ painter's order on the deck
function deck() {
  const items = [
    { at: [-60, -50, DECK], svg: screen() },
    { at: [OLED.x + OLED.w / 2, OLED.y + OLED.d / 2, DECK], svg: oled() },
    { at: [PAD_FRAME.x + PAD_FRAME.w / 2, PAD_FRAME.y + PAD_FRAME.d / 2, DECK], svg: pads() },
    ...knobs().map((knob) => ({ at: [knob.centre[0], knob.centre[1], DECK], svg: knob.svg })),
    ...buttons().map((button) => ({ at: [button.centre[0], button.centre[1], DECK], svg: button.svg })),
    { at: [LED[0], LED[1], DECK], svg: led() },
    { at: [96, 79, DECK], svg: labelPlate() },
  ];
  return sorted(items, (item) => item.at).map((item) => item.svg).join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Le séquenceur terminé : un boîtier noir posé sur quatre pieds. Sur le dessus, une grille de seize pads, quatre encodeurs, trois boutons, un petit écran OLED et un écran tactile de sept pouces incliné. Sur le côté, une prise MIDI à cinq broches et une prise d'alimentation USB-C. Les pas du motif s'allument sur les pads et sur l'écran.",
  body: [chassis(), sideJacks(), deck()],
});

// ------------------------------------------------------------------ live
const live = `
const P = ${JSON.stringify(P)};
const KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP}, KNOB0 = ${JSON.stringify(KNOBS[0])};
const STEPS = ${STEPS};
const ROW = { bass: ${JSON.stringify(BASS)}, fm: ${JSON.stringify(FM)}, drum: ${JSON.stringify(DRUM)} };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const pads = [...svg.querySelectorAll(".pad")].sort((a, b) => a.dataset.pad - b.dataset.pad);
const leds = pads.map((pad) => pad.querySelector(".pad-led"));
const moves = pads.map((pad) => pad.querySelector(".pad-move"));
const bodies = pads.map((pad) => pad.querySelector(".iso-solid"));
const cells = [...svg.querySelectorAll(".cell")];
const bassCells = cells.filter((cell) => cell.dataset.row === "0");
const ticks = [...svg.querySelectorAll(".tick")];
const head = svg.querySelector("#scr-head");
const tempoText = svg.querySelector("#scr-tempo");
const stepText = svg.querySelector("#scr-step");
const oledStep = svg.querySelector("#oled-step");
const knob0 = svg.querySelector("#knob-0");
const play = svg.querySelector("#btn-play");
const midiLed = svg.querySelector("#midi-led .iso-dots");
const X_OF = (s) => ${CELL.x0} + s * ${CELL.w + CELL.gap} + (s >= 8 ? 2 : 0) + (s >= 4 && s < 8 ? 1 : 0) + (s >= 12 ? 3 : 0);
const steps = ROW.bass.map(Boolean);
let bpm = 120, playing = !still.matches, step = -1, clock = 0, frame = 0, last = 0, visible = false, flash = 0;
const pressed = new Map();
const knobAngle = (value) => ((value - 60) / 120) * 270 - 135;

function paint() {
  const now = Math.max(step, 0);
  pads.forEach((pad, i) => {
    const isHead = playing && i === step;
    leds[i].setAttribute("data-tone", isHead ? "lit" : steps[i] ? "mid" : "faint");
    if (isHead) bodies[i].setAttribute("data-lit", ""); else bodies[i].removeAttribute("data-lit");
    moves[i].setAttribute("transform", pressed.has(i) ? translateAlong(P, [0, 0, -1.4]) : "");
  });
  bassCells.forEach((cell, i) => { if (steps[i]) cell.setAttribute("data-on", ""); else cell.removeAttribute("data-on"); });
  head.setAttribute("x", X_OF(now) - 1);
  head.style.opacity = playing ? 1 : 0.35;
  ticks.forEach((tick, i) => tick.toggleAttribute("data-now", i === now));
  const label = String(now + 1).padStart(2, "0");
  stepText.textContent = "PAS " + label + "/16";
  oledStep.textContent = label;
  tempoText.textContent = bpm + " BPM";
  knob0.setAttribute("d", lineOnTop([KNOB0[0], KNOB0[1]], [KNOB0[0] + Math.sin(knobAngle(bpm) * Math.PI / 180) * (KNOB_R - 0.5), KNOB0[1] - Math.cos(knobAngle(bpm) * Math.PI / 180) * (KNOB_R - 0.5)], KNOB_TOP, P));
  play.setAttribute("transform", playing ? translateAlong(P, [0, 0, -1.5]) : "");
  midiLed.setAttribute("data-tone", flash > 0 ? "hi" : "faint");
  const active = steps.filter(Boolean).length;
  const text = bpm + " BPM · pas " + String(now + 1).padStart(2, "0") + "/16 · " + active + " actifs";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(bpm));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (flash > 0) flash -= dt;
  if (playing) {
    clock += dt;
    const period = 60 / bpm / 4;
    while (clock >= period) { clock -= period; step = (step + 1) % STEPS; if (steps[step]) flash = 0.06; }
  }
  paint();
  frame = visible && (playing || flash > 0) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const show = () => { paint(); run(); };

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerdown", (event) => {
  const pad = event.target.closest(".pad");
  if (!pad) return;
  const i = Number(pad.dataset.pad);
  steps[i] = !steps[i];
  pressed.set(i, true);
  show();
});
const release = () => { if (pressed.size) { pressed.clear(); show(); } };
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("pointerleave", release);
stage.addEventListener("keydown", (event) => {
  const big = event.shiftKey ? 10 : 2;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") bpm = clamp(bpm + big, 60, 180);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") bpm = clamp(bpm - big, 60, 180);
  else if (event.key === " ") playing = !playing;
  else if (event.key === "Enter") { const i = Math.max(step, 0); steps[i] = !steps[i]; }
  else return;
  event.preventDefault();
  show();
});
paint();
`;

const css = `
.iso{--scr-bg:#0d110f;--scr-bar:#18201c;--scr-cell:#232d28;--scr-on:#8fa196;--scr-text:#c5d0c9;--scr-dim:#6b7a72;--scr-head:#f0f5f2}
.scr-glass{fill:var(--scr-bg)}.scr-bar{fill:var(--scr-bar)}
.scr-t{fill:var(--scr-text);font-family:ui-monospace,Menlo,monospace;letter-spacing:.02em}.scr-t.dim{fill:var(--scr-dim)}.scr-t.big{fill:var(--scr-head)}
.cell{fill:var(--scr-cell);stroke:none}.cell[data-on]{fill:var(--scr-on)}
.scr-head{fill:none;stroke:var(--scr-head);stroke-width:.7;vector-effect:none;transition:opacity .2s}
.tick{fill:var(--scr-cell)}.tick[data-now]{fill:var(--scr-head)}
.pad{cursor:pointer}
.iso-stage .pad-led{stroke-width:1.2}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Séquenceur 16 pas",
  hint: "Cliquer sur les pads pour écrire le motif",
  readout: "120 BPM · pas 01/16 · 6 actifs",
  keys: [
    { mark: "lit", label: "Le pas en cours de lecture" },
    { mark: "raised", label: "Un pad par pas, allumé s'il est actif" },
  ],
  caption:
    "Le séquenceur monté : un Raspberry Pi 4 caché dans le boîtier pilote une grille de 16 pads (NeoTrellis, I2C), quatre encodeurs, trois boutons, un OLED 1,3″ et un écran tactile 7″ (DSI). La sortie MIDI DIN-5 part vers les Volcas, l'alimentation entre par l'USB-C. Chaque pas dure un seizième de temps : à 120 BPM, 125 ms, et le motif de 16 pas se répète toutes les 2 s.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Séquenceur : cliquer sur un pad pour l'activer, flèches pour le tempo, espace pour lecture ou pause, entrée pour écrire le pas en cours" aria-valuemin="60" aria-valuemax="180" aria-valuenow="120" style="touch-action:manipulation">${svg}</div>`,
});

const full = k.pageHtml({ title: "Séquenceur Volca", theme, body: `<style>${css}</style>${body}`, script: kitScript() + "\n" + live, width: 760 });
const name = theme === "light" ? "sequenceur-light.html" : "sequenceur.html";
writeFileSync(join(HERE, name), full);
console.log("wrote", name);
