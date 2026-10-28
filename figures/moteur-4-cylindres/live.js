const P = __P__;
const stage = document.querySelector(".iso-stage");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (id) => document.getElementById(id);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const parts = [0, 1, 2, 3].map((i) => ({
  far: $("far-" + i), rod: $("rod-" + i), piston: $("piston-" + i), gas: $("gas-" + i), near: $("near-" + i),
  valves: [0, 1].map((n) => ({ low: $("low-" + i + "-" + n), up: $("up-" + i + "-" + n), lobe: $("lobe-" + i + "-" + n), kind: n ? "exhaust" : "intake", seen: -1 })),
}));
const fly = $("fly"), belt = $("belt"), sprCrank = $("spr-crank"), sprCam = $("spr-cam");
const VALVE_AT = VALVES.map((valve) => valve);
let theta = 0, rate = 0, want = 90, base = 90, paused = false, slow = false;
let touring = true, held = false, resumeAt = 0, frame = 0, last = 0, visible = false, said = "";

function draw() {
  parts.forEach((part, i) => {
    const t = throwSvg(P, i, theta);
    part.far.innerHTML = t.far;
    part.rod.innerHTML = t.rod;
    part.near.innerHTML = t.near;
    part.piston.setAttribute("transform", translateAlong(P, [0, 0, t.pistonLift]));
    const alpha = alphaOf(theta, i);
    part.gas.innerHTML = gasSvg(P, i, alpha);
    part.valves.forEach((slot, n) => {
      const valve = VALVE_AT[i * 2 + n];
      const open = lift(alpha, slot.kind);
      slot.low.setAttribute("transform", translateAlong(P, [0, 0, -open]));
      if (Math.abs(open - slot.seen) > 0.02) { slot.up.innerHTML = valveUpperSvg(P, valve, open); slot.seen = open; }
      slot.lobe.innerHTML = lobeSvg(P, valve, alpha);
    });
  });
  fly.innerHTML = flywheelMarks(P, theta);
  sprCrank.innerHTML = sprocketSvg(P, "crank", theta);
  sprCam.innerHTML = sprocketSvg(P, "cam", theta / 2);
  belt.innerHTML = beltSvg(P, -(theta * Math.PI / 180) * SPR.crank.r);
  const text = readoutOf(theta);
  if (text !== said) { readout.textContent = text; said = text; }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (!touring && !held && performance.now() > resumeAt && !paused) touring = !still.matches;
  const goal = paused || held || !touring ? 0 : want * (slow ? 0.2 : 1);
  rate = still.matches ? goal : rate + (goal - rate) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(rate) < 0.05 && goal === 0) rate = 0;
  theta += rate * dt;
  draw();
  frame = visible && (rate !== 0 || touring || held) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hand = () => { touring = false; resumeAt = performance.now() + 3600; };
const turnBy = (degrees) => { hand(); theta += degrees; draw(); stage.setAttribute("aria-valuenow", String(Math.round(wrap(theta, 720)))); say(); run(); };

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
let lastX = 0;
stage.addEventListener("pointerdown", (event) => { held = true; hand(); lastX = event.clientX; stage.setPointerCapture(event.pointerId); run(); });
stage.addEventListener("pointermove", (event) => {
  if (!held) return;
  theta += (event.clientX - lastX) * 0.9;
  lastX = event.clientX;
  hand();
  run();
});
const say = () => stage.setAttribute("aria-valuetext", "Vilebrequin " + said);
const release = () => { held = false; hand(); stage.setAttribute("aria-valuenow", String(Math.round(wrap(theta, 720)))); say(); };
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  const big = event.shiftKey ? 90 : 15;
  if (event.key === "ArrowRight") turnBy(big);
  else if (event.key === "ArrowLeft") turnBy(-big);
  else if (event.key === "ArrowUp") { want = clamp(want * 1.5, 12, 1080); touring = !still.matches; run(); }
  else if (event.key === "ArrowDown") { want = clamp(want / 1.5, 12, 1080); touring = !still.matches; run(); }
  else if (event.key === " ") { paused = !paused; if (!paused) { touring = !still.matches; } run(); }
  else if (event.key === "s" || event.key === "S") { slow = !slow; run(); }
  else if (event.key === "Home") { theta = 0; draw(); run(); }
  else return;
  event.preventDefault();
});
if (still.matches) touring = false;
draw();
