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

    if (options.template && !['basic'].includes(options.template)) {
      throw new Error(`Unknown template: ${options.template}. Available templates: basic`);
    }

    const project = {
      id: name,
      version: '1.0.0',
      mode: 'template',
      duration: 3,
      fps: 30,
      resolution: {
        width: 1280,
        height: 720,
      },
      backgroundColor: '#101820',
      template: {
        layers: [
          {
            id: 'intro',
            name: 'Intro scene',
            type: 'custom-code',
            zIndex: 1,
            startTime: 0,
            endTime: 3,
            visible: true,
            opacity: 1,
            properties: {
              code: `function createRenderer() {
  function render(t, context) {
    const ctx = context.mainContext;
    const w = context.width;
    const h = context.height;
    const progress = Math.min(1, t / 1.2);
    const pulse = 0.5 + Math.sin(t * Math.PI * 2) * 0.5;

    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, w, h);

    const radius = Math.max(w, h) * (0.18 + progress * 0.1);
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, radius);
    gradient.addColorStop(0, 'rgba(242, 170, 76, 0.32)');
    gradient.addColorStop(1, 'rgba(242, 170, 76, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.globalAlpha = progress;
    ctx.scale(0.9 + progress * 0.1, 0.9 + progress * 0.1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 86px Arial, sans-serif';
    ctx.fillStyle = '#f2aa4c';
    ctx.fillText('ui2v', 0, -38);
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('rendered in the browser', 0, 42);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(w * 0.2, h * 0.78, w * 0.6, 2);
    ctx.fillStyle = '#f2aa4c';
    ctx.fillRect(w * 0.2, h * 0.78, w * 0.6 * Math.min(1, t / 3), 2 + pulse);
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

A ui2v video project.

## Usage

\`\`\`bash
# Install the published CLI
npm install -g @ui2v/cli

# Validate project
ui2v validate animation.json

# Preview with a sharp browser canvas
ui2v preview animation.json --pixel-ratio 2

# Render video
ui2v render animation.json -o output.mp4

# Render with supersampling for cleaner text and edges
ui2v render animation.json -o output.mp4 --quality ultra --render-scale 2
\`\`\`

## Documentation

The npm package is @ui2v/cli; the installed command is ui2v.
See the ui2v README for full documentation.
`;

    await fs.writeFile(path.join(projectDir, 'README.md'), readme);

    spinner.succeed(chalk.green(`Created project: ${name}`));

    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  cd ${name}`));
    console.log(chalk.dim('  npm install -g @ui2v/cli'));
    console.log(chalk.dim('  ui2v validate animation.json'));
    console.log(chalk.dim('  ui2v preview animation.json --pixel-ratio 2'));
    console.log(chalk.dim('  ui2v render animation.json -o output.mp4'));
  } catch (error) {
    spinner.fail(chalk.red('Initialization failed'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
