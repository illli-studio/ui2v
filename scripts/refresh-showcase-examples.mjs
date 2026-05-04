import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const examples = [
  ['examples/basic-text/animation.json', project('basic-text-polished', 5, '#050914', basicCode())],
  ['examples/kitchen-sink/animation.json', project('kitchen-sink-gallery', 24, '#050914', kitchenSinkCode())],
];

const preservedFeaturedExamples = [
  'examples/hero-ai-launch/animation.json',
  'examples/product-showcase/animation.json',
  'examples/render-lab/animation.json',
];

for (const [file, data] of examples) {
  const target = resolve(root, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log(`Refreshed ${examples.length} utility showcase examples.`);
console.log(`Preserved ${preservedFeaturedExamples.length} hand-polished featured examples: ${preservedFeaturedExamples.join(', ')}`);

function project(id, duration, backgroundColor, code) {
  return {
    id,
    mode: 'template',
    duration,
    fps: 30,
    resolution: {
      width: 1920,
      height: 1080,
    },
    backgroundColor,
    template: {
      layers: [
        {
          id: `${id}-canvas`,
          name: `${id} Canvas scene`,
          type: 'custom-code',
          zIndex: 1,
          startTime: 0,
          endTime: duration,
          visible: true,
          opacity: 1,
          properties: {
            code,
          },
        },
      ],
    },
  };
}

function basicCode() {
  return `function createRenderer() {
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  function render(t, context) {
    var ctx = context.mainContext;
    var W = context.width;
    var H = context.height;
    var intro = ease(t / 1.1);
    var detail = ease((t - 0.7) / 1.2);
    var finish = ease((t - 2.7) / 0.9);
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#050914'); bg.addColorStop(0.56, '#0B1D34'); bg.addColorStop(1, '#13251A');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, t);
    ctx.save();
    ctx.globalAlpha = 0.16 + Math.sin(t * 1.4) * 0.04;
    ctx.fillStyle = '#00D4FF'; ctx.beginPath(); ctx.arc(W * 0.2, H * 0.78, 220, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2AA4C'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.22, 250, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLogoMark(ctx, W * 0.5, H * 0.34, 180, intro, t);
    ctx.save();
    ctx.globalAlpha = intro;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 120px Arial, sans-serif';
    var text = ctx.createLinearGradient(W * 0.32, 0, W * 0.68, 0);
    text.addColorStop(0, '#FFFFFF'); text.addColorStop(0.65, '#D7E6F4'); text.addColorStop(1, '#9CB7CC');
    ctx.fillStyle = text;
    ctx.fillText('ui2v', W / 2, H * 0.52 + (1 - intro) * 34);
    ctx.font = '700 32px Arial, sans-serif';
    ctx.fillStyle = '#9CB7CC';
    ctx.fillText('structured JSON to browser-rendered MP4', W / 2, H * 0.6 + (1 - intro) * 24);
    ctx.restore();
    var cards = [
      ['01', 'Validate', 'catch project issues before rendering', '#00D4FF'],
      ['02', 'Preview', 'scrub the exact timeline in Chromium', '#7BD88F'],
      ['03', 'Render', 'encode deterministic frames with WebCodecs', '#F2AA4C']
    ];
    for (var i = 0; i < cards.length; i++) {
      var p = ease((t - 1.0 - i * 0.18) / 0.65);
      var x = 300 + i * 660;
      drawCard(ctx, x, 780 + (1 - p) * 30, 500, 150, cards[i], p * detail);
    }
    drawProgress(ctx, W, H, t, 5, finish ? '#7BD88F' : '#00D4FF');
  }
  function drawGrid(ctx, W, H, t) { ctx.save(); ctx.globalAlpha = 0.1; ctx.strokeStyle = '#DFF6FF'; for (var x = -120; x < W + 120; x += 80) { ctx.beginPath(); ctx.moveTo(x + (t * 16) % 80, 0); ctx.lineTo(x - 220 + (t * 16) % 80, H); ctx.stroke(); } for (var y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore(); }
  function drawLogoMark(ctx, cx, cy, size, alpha, t) { ctx.save(); ctx.translate(cx, cy); ctx.scale(0.88 + alpha * 0.12, 0.88 + alpha * 0.12); ctx.rotate(Math.sin(t * 1.2) * 0.025); ctx.globalAlpha = alpha; ctx.shadowBlur = 38; ctx.shadowColor = 'rgba(0,212,255,.42)'; rr(ctx, -size / 2, -size / 2, size, size, 42); ctx.fillStyle = '#071019'; ctx.fill(); var g = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2); g.addColorStop(0, '#00D4FF'); g.addColorStop(.5, '#7BD88F'); g.addColorStop(1, '#F2AA4C'); ctx.lineWidth = 14; ctx.strokeStyle = g; ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-24, -44); ctx.lineTo(56, 0); ctx.lineTo(-24, 44); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(223,246,255,.9)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-58, 62); ctx.lineTo(60, 62); ctx.stroke(); ctx.restore(); }
  function drawCard(ctx, x, y, w, h, card, alpha) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(5,9,20,.78)'; ctx.strokeStyle = card[3]; ctx.lineWidth = 2; rr(ctx, x - w / 2, y - h / 2, w, h, 20); ctx.fill(); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillStyle = card[3]; ctx.font = '900 26px Arial, sans-serif'; ctx.fillText(card[0], x - w / 2 + 34, y - 24); ctx.fillStyle = '#FFFFFF'; ctx.font = '900 34px Arial, sans-serif'; ctx.fillText(card[1], x - w / 2 + 92, y - 24); ctx.fillStyle = '#9CB7CC'; ctx.font = '22px Arial, sans-serif'; ctx.fillText(card[2], x - w / 2 + 34, y + 34); ctx.restore(); }
  function drawProgress(ctx, W, H, t, duration) { var p = clamp(t / duration); ctx.fillStyle = 'rgba(255,255,255,.13)'; rr(ctx, 160, H - 72, W - 320, 12, 6); ctx.fill(); var g = ctx.createLinearGradient(160, 0, W - 160, 0); g.addColorStop(0, '#00D4FF'); g.addColorStop(.55, '#7BD88F'); g.addColorStop(1, '#F2AA4C'); ctx.fillStyle = g; rr(ctx, 160, H - 72, (W - 320) * p, 12, 6); ctx.fill(); }
  return { render: render };
}`;
}

function productCode() {
  return `function createRenderer() {
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function easeIO(x) { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  function render(t, context) {
    var ctx = context.mainContext, W = context.width, H = context.height;
    var intro = ease(t / 1.2), hero = ease((t - 1.0) / 1.5), metrics = ease((t - 2.5) / 1.1), final = ease((t - 5.8) / 1.0);
    background(ctx, W, H, t);
    copy(ctx, W, H, intro, final);
    product(ctx, W, H, t, hero);
    metricCards(ctx, W, H, metrics);
    pipeline(ctx, W, H, final);
    progress(ctx, W, H, t, 9);
  }
  function background(ctx, W, H, t) { var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#050914'); g.addColorStop(.48, '#0B1D34'); g.addColorStop(1, '#142117'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .12; ctx.strokeStyle = '#DFF6FF'; for (var x = -180; x < W + 180; x += 92) { ctx.beginPath(); ctx.moveTo(x + (t * 18) % 92, 0); ctx.lineTo(x - 310 + (t * 18) % 92, H); ctx.stroke(); } ctx.restore(); ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#00D4FF'; ctx.beginPath(); ctx.arc(W * .78, H * .2, 320 + Math.sin(t) * 26, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#F2AA4C'; ctx.beginPath(); ctx.arc(W * .22, H * .86, 280 + Math.cos(t * .8) * 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function copy(ctx, W, H, p, final) { ctx.save(); ctx.globalAlpha = p; ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 86px Arial, sans-serif'; ctx.fillText('Launch videos', 120, 174); ctx.fillText('from one JSON.', 120, 268); ctx.fillStyle = '#A9BDD2'; ctx.font = '28px Arial, sans-serif'; ctx.fillText('Design a product story once, preview it in Chromium,', 124, 340); ctx.fillText('then render deterministic MP4 frames for every release.', 124, 380); ctx.restore(); ctx.save(); ctx.globalAlpha = final; ctx.fillStyle = '#F2AA4C'; rr(ctx, 120, 836, 300, 72, 16); ctx.fill(); ctx.fillStyle = '#111827'; ctx.font = '900 22px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHIP THE DEMO', 270, 879); ctx.fillStyle = '#D7E6F4'; ctx.textAlign = 'left'; ctx.font = '23px Arial, sans-serif'; ctx.fillText('brand, copy, metrics, and export flow in code', 450, 879); ctx.restore(); }
  function product(ctx, W, H, t, p) { var cx = W * .69 + (1 - p) * 210, cy = H * .52; ctx.save(); ctx.translate(cx, cy); ctx.rotate((-7 + Math.sin(t * .7) * 1.2) * Math.PI / 180); ctx.scale(.84 + p * .14, .84 + p * .14); ctx.globalAlpha = p; ctx.shadowColor = 'rgba(0,0,0,.62)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 34; rr(ctx, -250, -365, 500, 730, 54); var shell = ctx.createLinearGradient(-250, -365, 250, 365); shell.addColorStop(0, '#F8FAFC'); shell.addColorStop(.48, '#D7E3EF'); shell.addColorStop(1, '#9CAEC0'); ctx.fillStyle = shell; ctx.fill(); ctx.shadowBlur = 0; rr(ctx, -196, -300, 392, 456, 36); var screen = ctx.createLinearGradient(-196, -300, 196, 156); screen.addColorStop(0, '#06111F'); screen.addColorStop(.48, '#0EA5E9'); screen.addColorStop(1, '#16A34A'); ctx.fillStyle = screen; ctx.fill(); ctx.save(); ctx.clip(); ctx.globalAlpha = .34; ctx.strokeStyle = '#FFFFFF'; for (var i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(0, -80, 42 + i * 32 + (t * 12) % 32, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); ctx.fillStyle = '#111827'; ctx.font = '900 52px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('UI2V', 0, 242); ctx.font = '22px Arial, sans-serif'; ctx.fillStyle = '#4B5563'; ctx.fillText('Browser Render System', 0, 282); ctx.fillStyle = '#F2AA4C'; ctx.beginPath(); ctx.arc(0, 324, 23 + Math.sin(t * 4) * 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function metricCards(ctx, W, H, p) { var cards = [['1920x1080', 'production canvas', '#00D4FF'], ['30 FPS', 'timeline frames', '#7BD88F'], ['WebCodecs', 'MP4 export', '#F2AA4C']]; for (var i = 0; i < cards.length; i++) { var x = 124 + i * 258, y = 512 + (1 - p) * 28; ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = 'rgba(5,9,20,.74)'; ctx.strokeStyle = cards[i][2]; rr(ctx, x, y, 222, 126, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = cards[i][2]; ctx.font = '900 28px Arial, sans-serif'; ctx.fillText(cards[i][0], x + 24, y + 48); ctx.fillStyle = '#B8C8D8'; ctx.font = '18px Arial, sans-serif'; ctx.fillText(cards[i][1], x + 24, y + 84); ctx.restore(); } }
  function pipeline(ctx, W, H, p) { var steps = ['JSON', 'Runtime', 'Canvas', 'WebCodecs', 'MP4']; ctx.save(); ctx.globalAlpha = p; ctx.font = '800 18px Arial, sans-serif'; ctx.textAlign = 'center'; for (var i = 0; i < steps.length; i++) { var x = 124 + i * 138, y = 710; ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, x - 54, y - 28, 108, 56, 12); ctx.fill(); ctx.strokeStyle = i < 4 ? '#00D4FF' : '#F2AA4C'; ctx.stroke(); ctx.fillStyle = '#EEF6FF'; ctx.fillText(steps[i], x, y + 5); if (i < 4) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + 58, y); ctx.lineTo(x + 80, y); ctx.stroke(); } } ctx.restore(); }
  function progress(ctx, W, H, t, d) { var p = clamp(t / d); ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, 120, H - 72, W - 240, 12, 6); ctx.fill(); var g = ctx.createLinearGradient(120, 0, W - 120, 0); g.addColorStop(0, '#00D4FF'); g.addColorStop(.55, '#7BD88F'); g.addColorStop(1, '#F2AA4C'); ctx.fillStyle = g; rr(ctx, 120, H - 72, (W - 240) * p, 12, 6); ctx.fill(); }
  return { render: render };
}`;
}

function renderLabCode() {
  return `function createRenderer() {
  var bars = [];
  var initialized = false;
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function easeIO(x) { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  function init() { if (initialized) return; initialized = true; for (var i = 0; i < 36; i++) bars.push({ v: .25 + ((i * 37) % 61) / 100, phase: i * .71 }); }
  function render(t, context) { init(); var ctx = context.mainContext, W = context.width, H = context.height; var scene = Math.min(3, Math.floor(t / 3)); var p = (t - scene * 3) / 3; background(ctx, W, H, t, scene); if (scene === 0) intro(ctx, W, H, t, p); if (scene === 1) data(ctx, W, H, t, p); if (scene === 2) depth(ctx, W, H, t, p); if (scene === 3) exportScene(ctx, W, H, t, p); hud(ctx, W, H, t, scene); }
  function background(ctx, W, H, t, scene) { var palettes = [['#05070F', '#0B1D34', '#13251A'], ['#061018', '#102542', '#1B4332'], ['#080814', '#181A3F', '#2B1636'], ['#040B10', '#0A2725', '#202A12']]; var pal = palettes[scene]; var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal[0]); g.addColorStop(.56, pal[1]); g.addColorStop(1, pal[2]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .1; ctx.strokeStyle = '#FFFFFF'; for (var x = -160; x < W + 160; x += 84) { ctx.beginPath(); ctx.moveTo(x + (t * 18) % 84, 0); ctx.lineTo(x - 260 + (t * 18) % 84, H); ctx.stroke(); } ctx.restore(); }
  function intro(ctx, W, H, t, p) { var e = ease(p); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 96px Arial, sans-serif'; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 30; ctx.fillText('RENDER LAB', W / 2, H / 2 - 90 + (1 - e) * 42); ctx.shadowBlur = 0; ctx.fillStyle = '#D7E6F4'; ctx.font = '30px Arial, sans-serif'; ctx.fillText('data, depth, particles, and export timing from one JSON project', W / 2, H / 2 - 12); badges(ctx, W / 2, H / 2 + 102, e, ['JSON', 'Canvas', 'Runtime', 'WebCodecs']); ctx.restore(); particles(ctx, W, H, t, e); }
  function data(ctx, W, H, t, p) { var e = ease(p); ctx.fillStyle = '#FFFFFF'; ctx.font = '900 62px Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Live Data Story', 120, 152); ctx.fillStyle = '#A9BDD2'; ctx.font = '24px Arial, sans-serif'; ctx.fillText('Charts are deterministic Canvas instructions, ready for generated updates.', 124, 202); var base = 832; for (var i = 0; i < bars.length; i++) { var x = 140 + i * 45; var h = (170 + Math.sin(t * 1.4 + bars[i].phase) * 78 + bars[i].v * 380) * e; var g = ctx.createLinearGradient(x, base - h, x, base); g.addColorStop(0, i % 3 === 0 ? '#F2AA4C' : i % 3 === 1 ? '#00D4FF' : '#7BD88F'); g.addColorStop(1, 'rgba(255,255,255,.12)'); ctx.fillStyle = g; rr(ctx, x, base - h, 28, h, 8); ctx.fill(); } ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = .72; ctx.lineWidth = 4; ctx.beginPath(); for (var k = 0; k < 180; k++) { var xx = 140 + k * (W - 280) / 179; var yy = 420 + Math.sin(k * .12 + t * 2) * 52 + Math.cos(k * .031 + t) * 78; if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); ctx.globalAlpha = 1; }
  function depth(ctx, W, H, t, p) { var e = ease(p), cx = W / 2, cy = H / 2 + 30; ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 62px Arial, sans-serif'; ctx.fillText('Pseudo-3D Without Assets', cx, 142); var verts = [], size = 230; for (var x = -1; x <= 1; x += 2) for (var y = -1; y <= 1; y += 2) for (var z = -1; z <= 1; z += 2) verts.push(project(x * size, y * size, z * size, t * .55, t * .75, cx, cy)); var edges = [[0,1],[0,2],[0,4],[3,1],[3,2],[3,7],[5,1],[5,4],[5,7],[6,2],[6,4],[6,7]]; ctx.strokeStyle = '#F2AA4C'; ctx.lineWidth = 6; ctx.shadowBlur = 20; ctx.shadowColor = '#F2AA4C'; for (var i = 0; i < edges.length; i++) { var a = verts[edges[i][0]], b = verts[edges[i][1]]; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } ctx.shadowBlur = 0; for (var r = 0; r < 18; r++) { ctx.strokeStyle = 'rgba(0,212,255,' + (.08 + r * .018) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, 150 + r * 34, 48 + r * 10, t * .1 + r * .12, 0, Math.PI * 2); ctx.stroke(); } badges(ctx, cx, 850, e, ['camera', 'matrix', 'route', 'draw commands']); }
  function exportScene(ctx, W, H, t, p) { var e = easeIO(p); ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 82px Arial, sans-serif'; ctx.fillText('EXPORT READY', W / 2, 260); ctx.fillStyle = '#B8FFE8'; ctx.font = '30px Arial, sans-serif'; ctx.fillText('The same timeline can preview, inspect, and render.', W / 2, 324); var steps = ['validate', 'preview', 'inspect', 'render', 'mp4']; for (var i = 0; i < steps.length; i++) { var x = 420 + i * 270, y = 560; ctx.globalAlpha = e; ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, x - 86, y - 54, 172, 108, 18); ctx.fill(); ctx.strokeStyle = i === 4 ? '#F2AA4C' : '#00D4FF'; ctx.stroke(); ctx.fillStyle = '#EEF6FF'; ctx.font = '800 26px Arial, sans-serif'; ctx.fillText(steps[i], x, y + 8); if (i < 4) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + 94, y); ctx.lineTo(x + 176, y); ctx.stroke(); } } ctx.globalAlpha = 1; }
  function particles(ctx, W, H, t, alpha) { ctx.save(); ctx.globalAlpha = alpha; for (var i = 0; i < 160; i++) { var x = (i * 73 + Math.sin(t * .8 + i) * 80 + W) % W; var y = (i * 41 + Math.cos(t * .7 + i * .3) * 60 + H) % H; ctx.fillStyle = i % 3 === 0 ? '#00D4FF' : i % 3 === 1 ? '#7BD88F' : '#F2AA4C'; ctx.beginPath(); ctx.arc(x, y, 1.4 + i % 4, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  function hud(ctx, W, H, t, scene) { ctx.fillStyle = 'rgba(0,0,0,.38)'; rr(ctx, 48, 46, 390, 104, 16); ctx.fill(); ctx.fillStyle = '#DFF6FF'; ctx.font = '18px monospace'; ctx.fillText('render-lab flagship', 72, 84); ctx.fillStyle = '#7BD88F'; ctx.fillText('scene ' + (scene + 1) + '/4  frame ' + Math.floor(t * 30), 72, 116); progress(ctx, W, H, t, 12); }
  function badges(ctx, cx, y, e, items) { ctx.save(); ctx.textAlign = 'center'; for (var i = 0; i < items.length; i++) { var x = cx - (items.length - 1) * 105 + i * 210; ctx.globalAlpha = e; ctx.fillStyle = 'rgba(4,12,24,.72)'; rr(ctx, x - 78, y - 34, 156, 68, 14); ctx.fill(); ctx.strokeStyle = i % 2 ? '#F2AA4C' : '#00D4FF'; ctx.stroke(); ctx.fillStyle = '#EEF6FF'; ctx.font = '800 19px Arial, sans-serif'; ctx.fillText(items[i], x, y + 6); } ctx.restore(); }
  function progress(ctx, W, H, t, d) { ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, 120, H - 74, W - 240, 12, 6); ctx.fill(); var g = ctx.createLinearGradient(120, 0, W - 120, 0); g.addColorStop(0, '#00D4FF'); g.addColorStop(.55, '#7BD88F'); g.addColorStop(1, '#F2AA4C'); ctx.fillStyle = g; rr(ctx, 120, H - 74, (W - 240) * clamp(t / d), 12, 6); ctx.fill(); }
  function project(x, y, z, rx, ry, cx, cy) { var x1 = x * Math.cos(ry) - z * Math.sin(ry); var z1 = x * Math.sin(ry) + z * Math.cos(ry); var y1 = y * Math.cos(rx) - z1 * Math.sin(rx); var z2 = y * Math.sin(rx) + z1 * Math.cos(rx); var s = 900 / (900 + z2); return { x: cx + x1 * s, y: cy + y1 * s, z: z2, scale: s }; }
  return { render: render };
}`;
}

function kitchenSinkCode() {
  return `function createRenderer() {
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  function render(t, context) {
    var ctx = context.mainContext, W = context.width, H = context.height;
    var scene = Math.min(3, Math.floor(t / 6));
    var p = (t - scene * 6) / 6;
    background(ctx, W, H, t, scene);
    if (scene === 0) gallery(ctx, W, H, t, p);
    if (scene === 1) dashboard(ctx, W, H, t, p);
    if (scene === 2) systems(ctx, W, H, t, p);
    if (scene === 3) finale(ctx, W, H, t, p);
    footer(ctx, W, H, t, scene);
  }
  function background(ctx, W, H, t, scene) { var palettes = [['#050914','#0B1D34','#13251A'],['#061018','#102542','#1B4332'],['#080814','#181A3F','#2B1636'],['#040B10','#0A2725','#202A12']]; var pal = palettes[scene]; var g = ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,pal[0]); g.addColorStop(.55,pal[1]); g.addColorStop(1,pal[2]); ctx.fillStyle = g; ctx.fillRect(0,0,W,H); ctx.save(); ctx.globalAlpha=.12; ctx.strokeStyle='#DFF6FF'; for(var x=-160;x<W+160;x+=88){ctx.beginPath();ctx.moveTo(x+(t*18)%88,0);ctx.lineTo(x-280+(t*18)%88,H);ctx.stroke();} ctx.restore(); }
  function gallery(ctx,W,H,t,p){ var e=ease(p); title(ctx,W,'Capability Gallery','curated examples instead of visual noise',e); var items=[['Typography','#00D4FF'],['Charts','#7BD88F'],['Depth','#F2AA4C'],['Particles','#FF5C8A'],['Pipeline','#C7A6FF'],['Export','#79D9FF']]; for(var i=0;i<items.length;i++){ var x=300+(i%3)*660, y=430+Math.floor(i/3)*220; ctx.save(); ctx.globalAlpha=ease((p*6-i*.22)); ctx.fillStyle='rgba(5,9,20,.72)'; ctx.strokeStyle=items[i][1]; rr(ctx,x-250,y-80,500,160,22); ctx.fill(); ctx.stroke(); ctx.fillStyle=items[i][1]; ctx.font='900 34px Arial'; ctx.textAlign='center'; ctx.fillText(items[i][0],x,y-10); ctx.fillStyle='#A9BDD2'; ctx.font='20px Arial'; ctx.fillText('rendered by deterministic Canvas code',x,y+34); ctx.restore(); } }
  function dashboard(ctx,W,H,t,p){ var e=ease(p); title(ctx,W,'Data Dashboard','animated metrics that stay readable',e); for(var i=0;i<28;i++){ var x=250+i*50; var h=(120+Math.sin(t*1.3+i*.45)*62+(i%7)*32)*e; var color=i%3===0?'#00D4FF':i%3===1?'#7BD88F':'#F2AA4C'; ctx.fillStyle=color; rr(ctx,x,830-h,28,h,8); ctx.fill(); } ctx.strokeStyle='#FFFFFF'; ctx.globalAlpha=.75; ctx.lineWidth=4; ctx.beginPath(); for(var k=0;k<160;k++){ var xx=230+k*(W-460)/159; var yy=360+Math.sin(k*.1+t*2)*46+Math.cos(k*.04+t)*74; if(k===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);} ctx.stroke(); ctx.globalAlpha=1; }
  function systems(ctx,W,H,t,p){ var e=ease(p), cx=W/2, cy=H/2+20; title(ctx,W,'System Orchestration','scene graph, adapters, and export frames',e); var nodes=[['JSON',-390,-130,'#00D4FF'],['Runtime',0,-190,'#7BD88F'],['Canvas',390,-130,'#F2AA4C'],['Inspect',-260,130,'#FF5C8A'],['MP4',260,130,'#C7A6FF']]; ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=3; for(var i=0;i<nodes.length;i++){for(var j=i+1;j<nodes.length;j++){ctx.beginPath();ctx.moveTo(cx+nodes[i][1],cy+nodes[i][2]);ctx.lineTo(cx+nodes[j][1],cy+nodes[j][2]);ctx.stroke();}} for(var n=0;n<nodes.length;n++){var nd=nodes[n], x=cx+nd[1], y=cy+nd[2]; ctx.fillStyle=nd[3]; rr(ctx,x-104,y-36,208,72,18); ctx.fill(); ctx.fillStyle='#061014'; ctx.font='900 24px Arial'; ctx.textAlign='center'; ctx.fillText(nd[0],x,y+8);} }
  function finale(ctx,W,H,t,p){ var e=ease(p); ctx.save(); ctx.textAlign='center'; ctx.fillStyle='#FFFFFF'; ctx.font='900 92px Arial'; ctx.shadowColor='#00D4FF'; ctx.shadowBlur=28; ctx.fillText('READY TO RENDER',W/2,H/2-90+(1-e)*40); ctx.shadowBlur=0; ctx.fillStyle='#B8FFE8'; ctx.font='30px Arial'; ctx.fillText('copy this structure, change the story, ship an MP4',W/2,H/2-20); var steps=['validate','preview','inspect','render']; for(var i=0;i<steps.length;i++){var x=W/2-315+i*210, y=H/2+130; ctx.globalAlpha=e; ctx.fillStyle='rgba(255,255,255,.1)'; rr(ctx,x-78,y-36,156,72,16); ctx.fill(); ctx.strokeStyle=i===3?'#F2AA4C':'#00D4FF'; ctx.stroke(); ctx.fillStyle='#EEF6FF'; ctx.font='800 21px Arial'; ctx.fillText(steps[i],x,y+7);} ctx.restore(); }
  function title(ctx,W,main,sub,a){ ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.fillStyle='#FFFFFF'; ctx.font='900 70px Arial'; ctx.fillText(main,W/2,140); ctx.fillStyle='#A9BDD2'; ctx.font='27px Arial'; ctx.fillText(sub,W/2,192); ctx.restore(); }
  function footer(ctx,W,H,t,scene){ ctx.fillStyle='rgba(0,0,0,.36)'; rr(ctx,52,46,420,104,16); ctx.fill(); ctx.fillStyle='#DFF6FF'; ctx.font='18px monospace'; ctx.fillText('kitchen-sink gallery',76,84); ctx.fillStyle='#7BD88F'; ctx.fillText('scene '+(scene+1)+'/4  frame '+Math.floor(t*30),76,116); var p=clamp(t/24); ctx.fillStyle='rgba(255,255,255,.14)'; rr(ctx,120,H-72,W-240,12,6); ctx.fill(); var g=ctx.createLinearGradient(120,0,W-120,0); g.addColorStop(0,'#00D4FF'); g.addColorStop(.55,'#7BD88F'); g.addColorStop(1,'#F2AA4C'); ctx.fillStyle=g; rr(ctx,120,H-72,(W-240)*p,12,6); ctx.fill(); }
  return { render: render };
}`;
}
