import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';

interface InitOptions {
  template?: string;
}

export async function initCommand(
  name: string,
  options: InitOptions
): Promise<void> {
  const spinner = ora('Initializing project...').start();

  try {
    const projectDir = path.resolve(process.cwd(), name);

    if (fs.existsSync(projectDir)) {
      spinner.stop();
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${name} already exists. Overwrite?`,
        initial: false,
      });

      if (!response.overwrite) {
        console.log(chalk.yellow('Cancelled'));
        process.exit(0);
      }

      spinner.start('Initializing project...');
    }

    await fs.ensureDir(projectDir);

    if (options.template && !['launch', 'basic'].includes(options.template)) {
      throw new Error(`Unknown template: ${options.template}. Available templates: launch (basic is an alias)`);
    }

    const project = {
      id: name,
      version: '1.0.0',
      mode: 'template',
      duration: 6,
      fps: 30,
      resolution: {
        width: 1920,
        height: 1080,
      },
      backgroundColor: '#030712',
      template: {
        layers: [
          {
            id: 'intro',
            name: 'Intro scene',
            type: 'custom-code',
            zIndex: 1,
            startTime: 0,
            endTime: 6,
            visible: true,
            opacity: 1,
            dependencies: ['d3', 'gsap', 'animejs', 'three', 'mathjs', 'simplex-noise', 'rough'],
            properties: {
              dependencies: ['d3', 'gsap', 'animejs', 'three', 'mathjs', 'simplex-noise', 'rough'],
              code: `function createRenderer() {
  function clamp(value) {
    if (anime && anime.utils && anime.utils.clamp) return anime.utils.clamp(value, 0, 1);
    return Math.max(0, Math.min(1, value));
  }
  function easeOut(value) {
    if (gsap && gsap.parseEase) return gsap.parseEase('power3.out')(clamp(value));
    value = clamp(value);
    return 1 - Math.pow(1 - value, 3);
  }
  function easeInOut(value) { value = clamp(value); return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2; }
  const seedNoise = simplex && simplex.createNoise2D ? simplex.createNoise2D(function() { return 0.42; }) : function(x, y) { return Math.sin(x * 12.9898 + y * 78.233) % 1; };
  const metricScale = d3 && d3.scaleLinear ? d3.scaleLinear().domain([0, 1]).range([22, 210]) : function(value) { return 22 + value * 188; };
  const formatPercent = d3 && d3.format ? d3.format('.0%') : function(value) { return Math.round(value * 100) + '%'; };
  const palette = d3 && d3.interpolateTurbo ? [0.08, 0.26, 0.46, 0.66, 0.86].map(d3.interpolateTurbo) : ['#00D4FF', '#7BD88F', '#F2AA4C', '#FF5C7A', '#B487FF'];
  const data = [0.72, 0.46, 0.88, 0.61, 0.79, 0.54, 0.93];
  function roundedRect(ctx, x, y, width, height, radius) {
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
  function render(t, context) {
    const ctx = context.mainContext;
    const width = context.width;
    const height = context.height;
    const intro = easeOut(t / 0.9);
    const cards = easeOut((t - 1.2) / 1.1);
    const pipeline = easeOut((t - 2.3) / 1.2);
    const final = easeOut((t - 4.4) / 0.8);

    drawBackground(ctx, width, height, t);
    drawGrid(ctx, width, height, t, intro);
    drawHero(ctx, width, height, intro, final);
    drawLibraryConstellation(ctx, width, height, t, intro);
    drawThreeBadge(ctx, width, height, t, intro);
    drawDataPanel(ctx, width, height, t, cards);
    drawCards(ctx, width, height, t, cards);
    drawPipeline(ctx, width, height, t, pipeline);
    drawFinalCta(ctx, width, height, final);
    drawProgress(ctx, width, height, t, 6);
  }
  function drawBackground(ctx, width, height, t) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#030712');
    gradient.addColorStop(0.45, '#07172A');
    gradient.addColorStop(1, '#15102A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.2;
    const cyan = ctx.createRadialGradient(width * 0.22, height * 0.18, 10, width * 0.22, height * 0.18, 620);
    cyan.addColorStop(0, '#00D4FF');
    cyan.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = cyan;
    ctx.fillRect(0, 0, width, height);
    const amber = ctx.createRadialGradient(width * 0.8, height * 0.7, 10, width * 0.8, height * 0.7, 680);
    amber.addColorStop(0, '#F2AA4C');
    amber.addColorStop(1, 'rgba(242,170,76,0)');
    ctx.fillStyle = amber;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 80; i++) {
      const x = (i * 157 + t * 22) % width;
      const y = (i * 83 + Math.sin(t + i) * 18 + height) % height;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawLibraryConstellation(ctx, width, height, t, alpha) {
    ctx.save();
    ctx.globalAlpha = 0.42 * alpha;
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 120; i++) {
      const n = seedNoise(i * 0.17, t * 0.18);
      const angle = i * 2.399 + t * 0.18;
      const radius = 120 + (i % 19) * 17 + n * 24;
      const x = width * 0.67 + Math.cos(angle) * radius;
      const y = height * 0.42 + Math.sin(angle * 0.82) * radius * 0.62;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
      if (i % 9 === 0) {
        ctx.strokeStyle = palette[(i + 2) % palette.length] + '66';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(width * 0.67 + Math.cos(angle + 0.4) * radius * 0.82, height * 0.42 + Math.sin(angle * 0.82 + 0.4) * radius * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawThreeBadge(ctx, width, height, t, alpha) {
    const hasThree = typeof THREE !== 'undefined' && THREE && THREE.Vector3;
    const vector = hasThree ? new THREE.Vector3(Math.sin(t), Math.cos(t * 0.7), 1).normalize() : { x: 0.4, y: 0.2 };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(1500, 210);
    ctx.rotate(t * 0.22);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.strokeStyle = palette[i % palette.length] + 'AA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -72);
      ctx.lineTo(62 + vector.x * 16, 36 + vector.y * 12);
      ctx.lineTo(-62 + vector.y * 16, 36 - vector.x * 12);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.rotate(-t * 0.22);
    ctx.textAlign = 'center';
    ctx.font = '900 22px Arial, sans-serif';
    ctx.fillStyle = '#EAF6FF';
    ctx.fillText(hasThree ? 'THREE ready' : '3D ready', 0, 6);
    ctx.restore();
  }
  function drawDataPanel(ctx, width, height, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    roundedRect(ctx, 1040, 575, 730, 230, 34);
    ctx.fillStyle = 'rgba(5,12,24,0.74)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.stroke();
    ctx.font = '900 24px Arial, sans-serif';
    ctx.fillStyle = '#F8FBFF';
    ctx.fillText('D3 + math.js live dependency panel', 1085, 625);
    const mean = math && math.mean ? math.mean(data) : data.reduce((sum, item) => sum + item, 0) / data.length;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] * (0.72 + 0.28 * Math.sin(t * 1.4 + i) * 0.5 + 0.14);
      const barHeight = metricScale(clamp(value));
      const x = 1090 + i * 88;
      const y = 760 - barHeight;
      ctx.fillStyle = palette[i % palette.length];
      roundedRect(ctx, x, y, 54, barHeight, 12);
      ctx.fill();
    }
    ctx.font = '800 20px Arial, sans-serif';
    ctx.fillStyle = '#9CB7CC';
    ctx.fillText('mean ' + formatPercent(mean) + (rough ? '  rough.js loaded' : ''), 1085, 782);
    ctx.restore();
  }
  function drawGrid(ctx, width, height, t, alpha) {
    ctx.save();
    ctx.globalAlpha = 0.1 * alpha;
    ctx.strokeStyle = '#DFF6FF';
    for (let x = -200; x < width + 220; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x + (t * 18) % 90, height * 0.05);
      ctx.lineTo(x - 360 + (t * 18) % 90, height);
      ctx.stroke();
    }
    for (let y = height * 0.58; y < height; y += 58) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawHero(ctx, width, height, intro, final) {
    ctx.save();
    ctx.globalAlpha = intro * (1 - final * 0.35);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '900 92px Arial, sans-serif';
    const text = ctx.createLinearGradient(140, 0, 880, 0);
    text.addColorStop(0, '#FFFFFF');
    text.addColorStop(0.7, '#D7E6F4');
    text.addColorStop(1, '#7BD88F');
    ctx.fillStyle = text;
    ctx.fillText('Your idea, rendered as video', 140, 230 + (1 - intro) * 35);
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillStyle = '#9CB7CC';
    ctx.fillText('JSON motion graphics · local preview · WebCodecs MP4 export', 146, 318 + (1 - intro) * 24);
    ctx.restore();
  }
  function drawCards(ctx, width, height, t, alpha) {
    const items = [
      ['01', 'Infer', 'AI code loads its browser libraries', '#00D4FF'],
      ['02', 'Preview', 'scrub multi-library motion live', '#7BD88F'],
      ['03', 'Render', 'export deterministic MP4 clips', '#F2AA4C']
    ];
    for (let i = 0; i < items.length; i++) {
      const p = easeOut((alpha * 1.25) - i * 0.16);
      const x = 150 + i * 560;
      const y = 720 + (1 - p) * 45;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.shadowBlur = 26;
      ctx.shadowColor = items[i][3] + '55';
      roundedRect(ctx, x, y, 480, 160, 34);
      ctx.fillStyle = 'rgba(7,17,31,0.74)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = items[i][3] + 'AA';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '900 24px Arial, sans-serif';
      ctx.fillStyle = items[i][3];
      ctx.fillText(items[i][0], x + 36, y + 45);
      ctx.font = '900 38px Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(items[i][1], x + 36, y + 88);
      ctx.font = '600 22px Arial, sans-serif';
      ctx.fillStyle = '#9CB7CC';
      ctx.fillText(items[i][2], x + 36, y + 125);
      ctx.restore();
    }
  }
  function drawPipeline(ctx, width, height, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    roundedRect(ctx, 1110, 158, 660, 380, 44);
    ctx.fillStyle = 'rgba(5,12,24,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();
    const labels = ['animation.json', 'Canvas frames', 'WebCodecs MP4'];
    for (let i = 0; i < labels.length; i++) {
      const y = 235 + i * 96;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.fillStyle = ['#00D4FF', '#7BD88F', '#F2AA4C'][i];
      ctx.beginPath();
      ctx.arc(1185, y, 15 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '800 30px Arial, sans-serif';
      ctx.fillStyle = '#F8FBFF';
      ctx.fillText(labels[i], 1230, y + 8);
      if (i < labels.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(1185, y + 28);
        ctx.lineTo(1185, y + 68);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawFinalCta(ctx, width, height, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 76px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Ship video from code', width / 2, 430);
    roundedRect(ctx, width / 2 - 260, 510, 520, 86, 43);
    const gradient = ctx.createLinearGradient(width / 2 - 260, 0, width / 2 + 260, 0);
    gradient.addColorStop(0, '#00D4FF');
    gradient.addColorStop(0.55, '#7BD88F');
    gradient.addColorStop(1, '#F2AA4C');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.fillStyle = '#07111F';
    ctx.font = '900 28px Arial, sans-serif';
    ctx.fillText('ui2v render animation.json', width / 2, 554);
    ctx.restore();
  }
  function drawProgress(ctx, width, height, t, duration) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundedRect(ctx, 140, height - 80, width - 280, 12, 6);
    ctx.fill();
    const gradient = ctx.createLinearGradient(140, 0, width - 140, 0);
    gradient.addColorStop(0, '#00D4FF');
    gradient.addColorStop(0.55, '#7BD88F');
    gradient.addColorStop(1, '#F2AA4C');
    ctx.fillStyle = gradient;
    roundedRect(ctx, 140, height - 80, (width - 280) * clamp(t / duration), 12, 6);
    ctx.fill();
    ctx.restore();
  }
  return { render };
}`,
            },
          },
        ],
      },
    };

    const projectPath = path.join(projectDir, 'animation.json');
    await fs.writeJSON(projectPath, project, { spaces: 2 });

    const readme = `# ${name}

A polished multi-library ui2v starter project.

This project renders a 6-second, 1920x1080 launch-style MP4 from structured JSON and a custom-code scene that explicitly loads and uses browser libraries including \`d3\`, \`gsap\`, \`animejs\`, \`three\`, \`mathjs\`, \`simplex-noise\`, and \`rough\`. Replace the copy, colors, datasets, and cards to turn it into a README hero clip, product announcement, or social launch asset.

The generated \`animation.json\` declares dependencies on the custom-code layer. ui2v also infers common dependencies from custom code, but keeping the list explicit makes AI-generated projects easier to inspect and reproduce.

## Usage

\`\`\`bash
# Install the published CLI
npm install -g @ui2v/cli

# Validate project
ui2v validate animation.json

# Preview with a sharp browser canvas
ui2v preview animation.json --pixel-ratio 2

# Render video
ui2v render animation.json -o output.mp4 --quality high

# Render with supersampling for cleaner text and edges
ui2v render animation.json -o output.mp4 --quality ultra --render-scale 2
\`\`\`

## Documentation

ui2v uses a local Chrome, Edge, or Chromium browser through puppeteer-core. Run \`ui2v doctor\` first if rendering fails.

See the ui2v README for examples, rendering options, and README asset workflows.
`;

    await fs.writeFile(path.join(projectDir, 'README.md'), readme);

    spinner.succeed(chalk.green(`Created project: ${name}`));

    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  cd ${name}`));
    console.log(chalk.dim('  npm install -g @ui2v/cli'));
    console.log(chalk.dim('  ui2v validate animation.json'));
    console.log(chalk.dim('  ui2v preview animation.json --pixel-ratio 2'));
    console.log(chalk.dim('  ui2v render animation.json -o output.mp4 --quality high'));
  } catch (error) {
    spinner.fail(chalk.red('Initialization failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
