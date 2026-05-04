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
            properties: {
              code: `function createRenderer() {
  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function easeOut(value) { value = clamp(value); return 1 - Math.pow(1 - value, 3); }
  function easeInOut(value) { value = clamp(value); return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2; }
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
      ['01', 'Validate', 'catch timeline and schema issues', '#00D4FF'],
      ['02', 'Preview', 'scrub motion in a real browser', '#7BD88F'],
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

A polished ui2v starter project.

This project renders a 6-second, 1920x1080 launch-style MP4 from structured JSON and a custom-code Canvas scene. Replace the copy, colors, and cards to turn it into a README hero clip, product announcement, or social launch asset.

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
