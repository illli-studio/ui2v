import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  ['examples/runtime-core/animation.json', runtimeProject({
    id: 'runtime-core-demo',
    name: 'Runtime Core Demo',
    version: '0.2.0',
    duration: 6,
    accent: '#F2AA4C',
    segments: [
      segment('identity', 'Identity', 0, 2, titleScene('Runtime Core', 'scene graph + timeline + adapter system', '#F2AA4C')),
      segment('orbit', 'Orbit', 2, 4, orbitScene('Scheduled Motion', 'motion nodes evaluated frame by frame', '#00D4FF')),
      segment('export', 'Export', 4, 6, pipelineScene('Inspect, preview, render', ['JSON', 'Runtime', 'Canvas', 'MP4'], '#7BD88F')),
    ],
    markers: [
      { id: 'identity', time: 0, label: 'Identity' },
      { id: 'motion', time: 2, label: 'Motion' },
      { id: 'export', time: 4, label: 'Export' },
    ],
  })],
  ['examples/runtime-core/segmented-custom-code.json', runtimeProject({
    id: 'segmented-custom-code',
    name: 'Segmented Custom Code UI Video',
    version: '0.3.0',
    duration: 9,
    accent: '#00D4FF',
    segments: [
      segment('opening', 'Opening', 0, 3, titleScene('Segmented UI Video', 'each scene owns its Canvas renderer', '#00D4FF')),
      segment('system', 'Runtime System', 3, 6, dashboardScene('Segment Runtime', 'timed data cards and chart motion', '#7BD88F')),
      segment('resolve', 'Resolve', 6, 9, pipelineScene('Custom code to MP4', ['Segment', 'Layer', 'Frame', 'Encode'], '#F2AA4C')),
    ],
  })],
  ['examples/runtime-core/uiv-runtime-one-minute-studio.json', runtimeProject({
    id: 'uiv-runtime-one-minute-studio',
    name: 'One Minute Studio',
    version: '0.4.0',
    duration: 15,
    accent: '#C7A6FF',
    segments: [
      segment('brief', 'Brief', 0, 3, titleScene('One Minute Studio', 'brief to storyboard to rendered clip', '#C7A6FF')),
      segment('storyboard', 'Storyboard', 3, 6, cardsScene('Storyboard Cards', ['Hook', 'Product', 'Proof', 'CTA'], '#00D4FF')),
      segment('compose', 'Compose', 6, 9, orbitScene('Composition Pass', 'assets, type, and transitions stay deterministic', '#7BD88F')),
      segment('review', 'Review', 9, 12, dashboardScene('Review Timeline', 'sample frames, routes, and draw commands', '#F2AA4C')),
      segment('ship', 'Ship', 12, 15, pipelineScene('Ship the video', ['Validate', 'Preview', 'Inspect', 'Render'], '#C7A6FF')),
    ],
  })],
  ['examples/runtime-core/uiv-runtime-showcase.json', runtimeProject({
    id: 'uiv-runtime-showcase',
    name: 'UIV Runtime Showcase',
    version: '0.4.0',
    duration: 12,
    accent: '#F2AA4C',
    segments: [
      segment('identity', 'Identity', 0, 3, titleScene('UIV Runtime', 'segment-aware rendering for generated video', '#F2AA4C')),
      segment('timeline', 'Timeline', 3, 6, timelineScene('Segmented Timeline Engine', '#00D4FF')),
      segment('orchestration', 'Orchestration', 6, 9, pipelineScene('Runtime Orchestration', ['Scene', 'Timeline', 'Adapter', 'Frame'], '#7BD88F')),
      segment('export', 'Export', 9, 12, titleScene('Deterministic Video Export', 'same JSON for preview, inspect, and render', '#FFFFFF')),
    ],
  })],
  ['examples/runtime-core/uiv-runtime-tilted-card-zoom.json', runtimeProject({
    id: 'uiv-tilted-card-zoom',
    name: 'Tilted Card Zoom',
    version: '0.4.0',
    duration: 8,
    accent: '#00D4FF',
    segments: [
      segment('intro', 'Intro', 0, 2, titleScene('Tilted Card Zoom', 'a focused motion pattern for UI demos', '#00D4FF')),
      segment('zoom', 'Zoom', 2, 6, tiltedCardScene('Project Detail', 'depth, scale, and readable product copy', '#F2AA4C')),
      segment('settle', 'Settle', 6, 8, pipelineScene('Pattern Anatomy', ['Tilt', 'Zoom', 'Reveal', 'Settle'], '#7BD88F')),
    ],
  })],
  ['examples/runtime-core/uiv-runtime-xyz-depth-demo.json', runtimeProject({
    id: 'uiv-xyz-depth-demo',
    name: 'XYZ Depth Demo',
    version: '0.4.0',
    duration: 12,
    accent: '#7BD88F',
    segments: [
      segment('intro', 'Intro', 0, 3, titleScene('XYZ Depth Demo', 'pseudo-3D depth drawn directly on Canvas', '#7BD88F')),
      segment('cube', 'Depth Cube', 3, 6, cubeScene('Rotating Coordinate Space', '#00D4FF')),
      segment('field', 'Depth Field', 6, 9, depthFieldScene('Layered Z Field', '#F2AA4C')),
      segment('export', 'Export', 9, 12, pipelineScene('Depth to Video', ['X axis', 'Y axis', 'Z depth', 'MP4'], '#7BD88F')),
    ],
  })],
];

const preservedFeaturedRuntimeExamples = [
  'examples/runtime-core/uiv-runtime-commerce-command-center.json',
];

for (const [file, data] of files) {
  const target = resolve(root, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log(`Refreshed ${files.length} runtime-core examples.`);
console.log(`Preserved ${preservedFeaturedRuntimeExamples.length} hand-polished featured runtime examples: ${preservedFeaturedRuntimeExamples.join(', ')}`);

function runtimeProject({ id, name, version, duration, accent, segments, markers = [] }) {
  return {
    schema: 'uiv-runtime',
    id,
    name,
    version,
    duration,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    backgroundColor: '#050914',
    variables: { accent },
    dependencies: ['canvas2d'],
    markers,
    timeline: { segments },
    scene: {
      root: {
        id: 'root',
        type: 'root',
        children: [],
      },
    },
  };
}

function segment(id, label, startTime, endTime, code) {
  return {
    id,
    label,
    startTime,
    endTime,
    dependencies: ['canvas2d'],
    code,
  };
}

function commonPrelude() {
  return `const p = Math.max(0, Math.min(1, context.progress ?? 0));
  const ease = 1 - Math.pow(1 - p, 3);
  const ctx = context.ctx;
  const w = context.width;
  const h = context.height;
  function rr(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#050914');
  bg.addColorStop(0.55, '#0B1D34');
  bg.addColorStop(1, '#13251A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#DFF6FF';
  for (let x = -140; x < w + 140; x += 88) {
    ctx.beginPath();
    ctx.moveTo(x + (t * 18) % 88, 0);
    ctx.lineTo(x - 280 + (t * 18) % 88, h);
    ctx.stroke();
  }
  ctx.restore();`;
}

function titleScene(title, subtitle, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '${accent}';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 88px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, h / 2 - 58 + (1 - ease) * 40);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '${accent}';
  ctx.font = '800 30px Arial, sans-serif';
  ctx.fillText('${subtitle}', w / 2, h / 2 + 34);
  ctx.restore();
}`;
}

function orbitScene(title, subtitle, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 64px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 150);
  ctx.fillStyle = '#A9BDD2';
  ctx.font = '26px Arial, sans-serif';
  ctx.fillText('${subtitle}', w / 2, 198);
  const cx = w / 2;
  const cy = h / 2 + 50;
  for (let ring = 0; ring < 5; ring++) {
    ctx.strokeStyle = 'rgba(0,212,255,' + (0.1 + ring * 0.05) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 170 + ring * 70, 54 + ring * 22, t * 0.08 + ring * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const a = t * 1.4 + i * Math.PI * 2 / 36;
    const rx = 230 + i * 5;
    const ry = 88 + (i % 6) * 12;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.fillStyle = i % 3 === 0 ? '${accent}' : i % 3 === 1 ? '#7BD88F' : '#F2AA4C';
    ctx.globalAlpha = 0.25 + ease * 0.75;
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
}`;
}

function dashboardScene(title, subtitle, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('${title}', 120, 150);
  ctx.fillStyle = '#A9BDD2';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('${subtitle}', 124, 200);
  for (let i = 0; i < 32; i++) {
    const x = 150 + i * 48;
    const height = (120 + Math.sin(t * 1.3 + i * 0.45) * 60 + (i % 8) * 34) * ease;
    const color = i % 3 === 0 ? '${accent}' : i % 3 === 1 ? '#00D4FF' : '#F2AA4C';
    const g = ctx.createLinearGradient(x, 830 - height, x, 830);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = g;
    rr(x, 830 - height, 28, height, 8);
    ctx.fill();
  }
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 0; k < 180; k++) {
    const x = 140 + k * (w - 280) / 179;
    const y = 410 + Math.sin(k * 0.12 + t * 2) * 52 + Math.cos(k * 0.031 + t) * 78;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}`;
}

function pipelineScene(title, steps, accent) {
  const jsSteps = JSON.stringify(steps);
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 70px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 225);
  const steps = ${jsSteps};
  for (let i = 0; i < steps.length; i++) {
    const x = w / 2 - (steps.length - 1) * 160 + i * 320;
    const y = h / 2 + 60;
    ctx.globalAlpha = ease;
    ctx.fillStyle = 'rgba(5, 9, 20, 0.78)';
    ctx.strokeStyle = i === steps.length - 1 ? '${accent}' : '#00D4FF';
    ctx.lineWidth = 2;
    rr(x - 118, y - 50, 236, 100, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#EEF6FF';
    ctx.font = '800 25px Arial, sans-serif';
    ctx.fillText(steps[i], x, y + 8);
    if (i < steps.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.beginPath();
      ctx.moveTo(x + 126, y);
      ctx.lineTo(x + 194, y);
      ctx.stroke();
    }
  }
}`;
}

function cardsScene(title, cards, accent) {
  const jsCards = JSON.stringify(cards);
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 68px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 150);
  const cards = ${jsCards};
  for (let i = 0; i < cards.length; i++) {
    const local = Math.max(0, Math.min(1, p * 1.4 - i * 0.12));
    const x = w / 2 - (cards.length - 1) * 190 + i * 380;
    const y = h / 2 + Math.sin(t + i) * 12;
    ctx.globalAlpha = local;
    ctx.fillStyle = 'rgba(5,9,20,0.78)';
    ctx.strokeStyle = i % 2 ? '${accent}' : '#00D4FF';
    rr(x - 145, y - 95 + (1 - local) * 35, 290, 190, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = i % 2 ? '${accent}' : '#7BD88F';
    ctx.font = '900 26px Arial, sans-serif';
    ctx.fillText('0' + (i + 1), x, y - 28 + (1 - local) * 35);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px Arial, sans-serif';
    ctx.fillText(cards[i], x, y + 24 + (1 - local) * 35);
  }
}`;
}

function timelineScene(title, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  const left = 160;
  const right = w - 160;
  const y = h / 2 + 40;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 150);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const x = left + (right - left) * i / 8;
    ctx.beginPath();
    ctx.moveTo(x, 250);
    ctx.lineTo(x, h - 210);
    ctx.stroke();
  }
  ctx.strokeStyle = '${accent}';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + (right - left) * ease, y);
  ctx.stroke();
  const labels = ['identity', 'timeline', 'orchestration', 'export'];
  for (let i = 0; i < labels.length; i++) {
    const x = left + (right - left) * (i + 0.5) / labels.length;
    ctx.fillStyle = i % 2 ? '#7BD88F' : '#F2AA4C';
    ctx.font = '800 28px Arial, sans-serif';
    ctx.globalAlpha = ease > i / labels.length ? 1 : 0.28;
    ctx.fillText(labels[i], x, y - 58);
  }
}`;
}

function tiltedCardScene(title, subtitle, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  const tilt = (-10 + ease * 10 + Math.sin(t) * 1.4) * Math.PI / 180;
  ctx.save();
  ctx.translate(w / 2, h / 2 + 25);
  ctx.rotate(tilt);
  ctx.scale(0.86 + ease * 0.18, 0.86 + ease * 0.18);
  ctx.shadowColor = 'rgba(0,0,0,0.62)';
  ctx.shadowBlur = 70;
  rr(-330, -215, 660, 430, 34);
  ctx.fillStyle = 'rgba(248,250,252,0.95)';
  ctx.fill();
  ctx.shadowBlur = 0;
  rr(-286, -166, 572, 214, 26);
  const screen = ctx.createLinearGradient(-286, -166, 286, 48);
  screen.addColorStop(0, '#06111F');
  screen.addColorStop(0.55, '${accent}');
  screen.addColorStop(1, '#16A34A');
  ctx.fillStyle = screen;
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = '900 48px Arial, sans-serif';
  ctx.fillText('${title}', 0, 112);
  ctx.fillStyle = '#4B5563';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('${subtitle}', 0, 154);
  ctx.restore();
}`;
}

function cubeScene(title, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 145);
  const cx = w / 2;
  const cy = h / 2 + 45;
  function project(x, y, z) {
    const ry = t * 0.65;
    const rx = t * 0.42;
    const x1 = x * Math.cos(ry) - z * Math.sin(ry);
    const z1 = x * Math.sin(ry) + z * Math.cos(ry);
    const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
    const s = 840 / (840 + z2);
    return { x: cx + x1 * s, y: cy + y1 * s };
  }
  const size = 230;
  const verts = [];
  for (let x of [-1, 1]) for (let y of [-1, 1]) for (let z of [-1, 1]) verts.push(project(x * size, y * size, z * size));
  const edges = [[0,1],[0,2],[0,4],[3,1],[3,2],[3,7],[5,1],[5,4],[5,7],[6,2],[6,4],[6,7]];
  ctx.strokeStyle = '${accent}';
  ctx.lineWidth = 6;
  ctx.shadowColor = '${accent}';
  ctx.shadowBlur = 20;
  for (const edge of edges) {
    const a = verts[edge[0]];
    const b = verts[edge[1]];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}`;
}

function depthFieldScene(title, accent) {
  return `function render(t, context) {
  ${commonPrelude()}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px Arial, sans-serif';
  ctx.fillText('${title}', w / 2, 145);
  const cx = w / 2;
  const cy = h / 2 + 70;
  for (let i = 0; i < 90; i++) {
    const z = i / 90;
    const angle = i * 0.52 + t * 0.8;
    const radius = 90 + z * 520;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * 0.38;
    ctx.globalAlpha = 0.16 + z * 0.84;
    ctx.fillStyle = i % 3 === 0 ? '${accent}' : i % 3 === 1 ? '#00D4FF' : '#7BD88F';
    ctx.beginPath();
    ctx.arc(x, y, 3 + z * 9, 0, Math.PI * 2);
    ctx.fill();
  }
}`;
}
