import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";

// ---------------------------------------------------------------- the truth
// One world unit is 2.5 mm: bore 80, stroke 80, rod 135, so 4 x 402 cm3 = 1.6 L.
export const XS = [-66, -22, 22, 66];
export const XB = [-88, -44, 0, 44, 88];
export const RIB = 4;
export const ZC = 46;
export const CR = 16;
export const ROD = 54;
export const PIN_UP = 12;
export const PIN_DN = 14;
export const PISTON_R = 15.2;
export const BORE_R = 16;
export const CLEAR = 3.6;
export const CROWN_TDC = ZC + CR + ROD + PIN_UP;
export const ROOF = CROWN_TDC + CLEAR;
export const ROOF_TOP = ROOF + 6;
export const DECK = 130;
export const ZCAM = 176;
export const CAM_Y = -6;
export const RB = 6;
export const LIFT = 6;
export const LOBE_HALF = 14;
export const VALVE_DX = 8;
export const VALVE_Y = CAM_Y;
export const BUCKET_H = 7;
export const CW = 21;
export const SHIFT = [0, 540, 180, 360];
export const PEAK = { intake: 465, exhaust: 255 };
export const FIRE_ADVANCE = 15;
export const STROKES = ["combustion", "échappement", "admission", "compression"];
export const SHORT = ["comb.", "éch.", "adm.", "comp."];
export const X_TIMING = 98;
export const FLY_X = [-108, -98];
export const SPR = { crank: { r: 4.25, teeth: 12 }, cam: { r: 8.5, teeth: 24 } };

const rad = (degrees) => (degrees * Math.PI) / 180;
export const wrap = (value, period) => ((value % period) + period) % period;

export const alphaOf = (theta, index) => wrap(theta - SHIFT[index], 720);
export const pinAngleOf = (theta, index) => (index === 1 || index === 2 ? theta + 180 : theta);
export const strokeOf = (alpha) => Math.floor(alpha / 180);
export const pinZ = (theta) => ZC + CR * Math.cos(rad(theta)) + Math.sqrt(ROD * ROD - (CR * Math.sin(rad(theta))) ** 2);
export const crankPin = (theta) => [CR * Math.sin(rad(theta)), ZC + CR * Math.cos(rad(theta))];
export const PIN0 = ZC + CR + ROD;

// A lobe is a convex egg: a base circle plus a nose. The follower sits on its lowest point.
const bump = (angle) => (Math.abs(angle) >= LOBE_HALF ? 0 : Math.cos((Math.PI * angle) / (2 * LOBE_HALF)) ** 2);
export function lobePolygon(beta) {
  const points = [];
  for (let angle = -180; angle < 180; angle += 3) {
    const r = RB + LIFT * bump(angle);
    const a = rad(beta + angle);
    points.push([-r * Math.sin(a), -r * Math.cos(a)]);
  }
  return G.hullOf(points);
}
export const lobeBeta = (alpha, kind) => wrap(alpha - PEAK[kind] + 360, 720) / 2 - 180;
export function lift(alpha, kind) {
  const low = Math.max(...lobePolygon(lobeBeta(alpha, kind)).map(([, z]) => -z));
  return Math.max(0, low - RB);
}
export const valveOpen = (alpha, kind) => lift(alpha, kind) > 0.05;

export function gasOf(alpha) {
  const stroke = strokeOf(alpha);
  const share = (alpha % 180) / 180;
  if (stroke === 0) return { kind: "fire", amount: 1, share };
  if (stroke === 1) return { kind: "dots", amount: 1 - share, share };
  if (stroke === 2) return { kind: "dots", amount: share, share };
  return { kind: "dots", amount: 1, share, spark: alpha > 720 - FIRE_ADVANCE };
}

// ---------------------------------------------------------------- the camera frames
const along = (x) => G.frameOf([x, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const circlePoints = (cy, cz, r, count = 18) => Array.from({ length: count }, (_, index) => [cy + r * Math.cos((index / count) * Math.PI * 2), cz + r * Math.sin((index / count) * Math.PI * 2)]);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// ---------------------------------------------------------------- crank throw, rod, piston, gas
function webPolygon(pinAngle, counterweight) {
  const theta = rad(pinAngle);
  const [py, pz] = crankPin(pinAngle);
  const points = [...circlePoints(py, pz, 6.5, 16), ...circlePoints(0, ZC, 8.5, 20)];
  for (let step = -5; step <= 5; step++) {
    const a = theta + Math.PI + rad(step * 11);
    points.push([counterweight * Math.sin(a), ZC + counterweight * Math.cos(a)]);
  }
  return G.hullOf(points);
}

export function throwSvg(P, index, theta) {
  const x = XS[index];
  const pinAngle = pinAngleOf(theta, index);
  const [py, pz] = crankPin(pinAngle);
  const web = webPolygon(pinAngle, CW);
  const F = along(x);
  const pinFrame = G.frameOf([x, py, pz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const zp = pinZ(pinAngle);
  const rodPolygon = G.hullOf([...circlePoints(0, zp, 5, 16), ...circlePoints(py, pz, 8.2, 22)]);
  const far = S(G.prismOf(F, web, -15, -9, P), { tone: "mid" }) + S(G.disc(-9, -3.5, 5, pinFrame, P), { tone: "hi" });
  const rod = S(G.prismOf(F, rodPolygon, -3.5, 3.5, P), { tone: "hi", crease: "lo" });
  const near = S(G.disc(3.5, 9, 5, pinFrame, P), { tone: "hi" }) + S(G.prismOf(F, web, 9, 15, P), { tone: "mid" });
  return { far, rod, near, pistonLift: zp - PIN0 };
}

export function pistonSvg(P, index) {
  const x = XS[index];
  const top = PIN0 + PIN_UP;
  const bottom = PIN0 - PIN_DN;
  const out = [];
  out.push(S(k.cylinder(x, 0, PISTON_R, bottom, top - bottom, P, 48, 0.8), { tone: "hi", crease: "lo" }));
  [3.2, 5.6, 8].forEach((down, ring) => out.push(L(k.sideArc(x, 0, PISTON_R, top - down, P, 28), { tone: ring === 2 ? "mid" : "lo" })));
  out.push(L(k.sideArc(x, 0, PISTON_R, bottom + 3, P, 28), { tone: "faint" }));
  const boss = G.frameOf([x + PISTON_R - 0.2, 0, PIN0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(L(G.circleOf(boss, 0, 3.6, P, 20), { tone: "lo" }));
  out.push(D([k.iso([x + PISTON_R - 0.2, 0, PIN0], P)], { size: 0.5, tone: "lo" }));
  return out.join("");
}

export function gasSvg(P, index, alpha) {
  const x = XS[index];
  const zp = pinZ(pinAngleOf(alpha + SHIFT[index], index));
  const crown = zp + PIN_UP;
  const height = ROOF - crown;
  const gas = gasOf(alpha);
  if (height < 0.4) return "";
  if (gas.kind === "fire") {
    const fade = gas.share > 0.78 ? "mid" : "lit";
    const column = S(k.cylinder(x, 0, PISTON_R - 0.4, crown, height, P, 40, 0), { tone: fade === "lit" ? "lit" : "mid", lit: fade === "lit", crease: fade === "lit" ? "lit" : "lo" });
    const streaks = height > 3 ? L(Array.from({ length: 7 }, (_, n) => { const a = Math.atan2(...k.towardViewer(P).slice().reverse()) + ((n - 3) * 0.42); return k.rise([x + (PISTON_R - 0.4) * Math.cos(a), (PISTON_R - 0.4) * Math.sin(a)], crown, ROOF, P); }).join(""), { tone: fade === "lit" ? "lit" : "lo" }) : "";
    return column + streaks;
  }
  const count = Math.round(gas.amount * DOTS.length);
  const points = DOTS.slice(0, count).map(([u, r, a]) => k.iso([x + r * Math.cos(a), r * Math.sin(a) * 0.9, crown + 0.6 + u * (height - 1.2)], P));
  const spark = gas.spark ? D([k.iso([x, 1.5, ROOF - 0.4], P)], { size: 1.3, tone: "lit" }) : "";
  return D(points, { size: 0.6, tone: "mid" }) + spark;
}
const DOTS = Array.from({ length: 26 }, (_, index) => {
  const seed = (n) => ((Math.sin(index * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return [seed(1), 2 + seed(2) * 11.5, seed(3) * Math.PI * 2];
});

// ---------------------------------------------------------------- the valve train
export const VALVES = XS.flatMap((x, index) => [
  { index, kind: "intake", x: x - VALVE_DX },
  { index, kind: "exhaust", x: x + VALVE_DX },
]);

export function valveLowerSvg(P, valve) {
  const { x } = valve;
  const out = [];
  out.push(S(k.cylinder(x, VALVE_Y, 1.6, ROOF - 0.2, 8.4, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, VALVE_Y, 5, ROOF - 1.8, 1.8, P, 28), { tone: valve.kind === "intake" ? "hi" : "mid", crease: "lo" }));
  return out.join("");
}

export function valveUpperSvg(P, valve, rise) {
  const { x } = valve;
  const out = [];
  const retainer = 161 - rise;
  out.push(S(k.cylinder(x, VALVE_Y, 1.6, ROOF_TOP - 0.2, retainer - ROOF_TOP + 0.4, P, 14), { tone: "mid", crease: "none" }));
  const turns = 7;
  const spring = [];
  for (let turn = 0; turn <= turns; turn++) spring.push(k.sideArc(x, VALVE_Y, 3.9, ROOF_TOP + 1 + ((retainer - ROOF_TOP - 1) * turn) / turns, P, 12));
  const facing = Math.atan2(...k.towardViewer(P).slice().reverse());
  const limbs = [-1, 1].map((side) => k.segment([x + 3.9 * Math.cos(facing + (side * Math.PI) / 2), VALVE_Y + 3.9 * Math.sin(facing + (side * Math.PI) / 2), ROOF_TOP + 1], [x + 3.9 * Math.cos(facing + (side * Math.PI) / 2), VALVE_Y + 3.9 * Math.sin(facing + (side * Math.PI) / 2), retainer], P)).join("");
  out.push(L(spring.join("") + limbs, { tone: "lo" }));
  out.push(S(k.cylinder(x, VALVE_Y, 5.6, ROOF_TOP, 1, P, 24), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(x, VALVE_Y, 4.2, retainer, 2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, VALVE_Y, 4.2, retainer + 2, BUCKET_H, P, 24, 0.4), { tone: "hi" }));
  return out.join("");
}

export function lobeSvg(P, valve, alpha) {
  const beta = lobeBeta(alpha, valve.kind);
  const F = G.frameOf([valve.x, CAM_Y, ZCAM], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const polygon = lobePolygon(beta).map(([y, z]) => [y, z]);
  return S(G.prismOf(F, polygon, -3, 3, P), { tone: valve.kind === "intake" ? "hi" : "mid", crease: "lo" });
}
// the bucket rides the lowest point of the egg
export const bucketRise = (alpha, kind) => lift(alpha, kind);

// ---------------------------------------------------------------- belts, sprockets, flywheel
export function sprocketSvg(P, which, angle) {
  const { r, teeth } = SPR[which];
  const [y, z] = which === "crank" ? [0, ZC] : [CAM_Y, ZCAM];
  const F = G.frameOf([X_TIMING - 2, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 4, r, F, P, { steps: 36 }), { tone: "hi", crease: "lo" })];
  const phase = Math.PI / 2 - rad(angle);
  out.push(L(G.ribsOf(F, 0, 4, r, teeth, P, { phase, least: 0.1 }), { tone: "lo" }));
  out.push(L(G.circleOf(F, 4, r * 0.55, P, 20), { tone: "faint" }));
  out.push(D([k.iso([X_TIMING + 2, y + r * 0.78 * Math.cos(phase), z + r * 0.78 * Math.sin(phase)], P)], { size: 0.55, tone: "hi" }));
  return out.join("");
}

export function beltPolygon(inset = 0) {
  const a = [0, ZC, SPR.crank.r + 0.9 - inset];
  const b = [CAM_Y, ZCAM, SPR.cam.r + 0.9 - inset];
  return G.hullOf([...circlePoints(a[0], a[1], a[2], 24), ...circlePoints(b[0], b[1], b[2], 36)]);
}

export function beltSvg(P, travel) {
  const loop = beltPolygon();
  const edge = (x) => k.pathOf(loop.concat([loop[0]]).map(([y, z]) => k.iso([x, y, z], P)));
  const out = [`<path class="iso-line" data-tone="mid" style="stroke-width:1.3" d="${edge(X_TIMING - 2.4)}"/>`, `<path class="iso-line" data-tone="mid" style="stroke-width:1.3" d="${edge(X_TIMING + 2.4)}"/>`];
  const pitch = 3.4;
  const lengths = [0];
  for (let index = 0; index < loop.length; index++) {
    const next = loop[(index + 1) % loop.length];
    lengths.push(lengths[index] + Math.hypot(next[0] - loop[index][0], next[1] - loop[index][1]));
  }
  const total = lengths[lengths.length - 1];
  const marks = [];
  for (let at = wrap(travel, pitch); at < total; at += pitch) {
    let edgeIndex = lengths.findIndex((value) => value > at) - 1;
    if (edgeIndex < 0) edgeIndex = loop.length - 1;
    const from = loop[edgeIndex];
    const to = loop[(edgeIndex + 1) % loop.length];
    const t = (at - lengths[edgeIndex]) / (lengths[edgeIndex + 1] - lengths[edgeIndex] || 1);
    const point = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    marks.push(k.segment([X_TIMING - 2.4, point[0], point[1]], [X_TIMING + 2.4, point[0], point[1]], P));
  }
  out.push(L(marks.join(""), { tone: "lo" }));
  return out.join("");
}

export function flywheelMarks(P, theta) {
  const F = G.frameOf([FLY_X[0], 0, ZC], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const phase = Math.PI / 2 - rad(theta);
  const s = FLY_X[1] - FLY_X[0];
  const out = [];
  out.push(L(G.ribsOf(F, 0, s, 26, 72, P, { phase, least: 0.1 }), { tone: "lo" }));
  out.push(D(G.dotsOf(F, s, 17, 6, P, { phase, all: true }), { size: 0.7, tone: "hi" }));
  out.push(L(G.spokesOf(F, s, 6.6, 15, 5, P, { phase }), { tone: "faint" }));
  const a = Math.PI / 2 - rad(theta);
  out.push(L(k.segment([FLY_X[1], 21 * Math.cos(a), ZC + 21 * Math.sin(a)], [FLY_X[1], 24.4 * Math.cos(a), ZC + 24.4 * Math.sin(a)], P), { tone: "lit" }));
  return out.join("");
}

export function readoutOf(theta) {
  const parts = [0, 1, 2, 3].map((index) => `${index + 1} ${SHORT[strokeOf(alphaOf(theta, index))]}`);
  return `${String(Math.round(wrap(theta, 720))).padStart(3, "0")}° · ${parts.join(" · ")}`;
}
