import chalk from 'chalk';
import * as os from 'os';

export async function infoCommand(): Promise<void> {
  console.log(chalk.bold('ui2v information\n'));

  console.log(chalk.dim('Version:'), '1.0.1');
  console.log(chalk.dim('Node.js:'), process.version);
  console.log(chalk.dim('Platform:'), `${os.platform()} ${os.arch()}`);
  console.log(chalk.dim('OS:'), `${os.type()} ${os.release()}`);
  console.log(chalk.dim('CPUs:'), os.cpus().length);
  console.log(
    chalk.dim('Memory:'),
    `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
  );

  console.log(chalk.dim('\nDocumentation:'), 'https://github.com/ui2v/ui2v#readme');
  console.log(chalk.dim('Issues:'), 'https://github.com/ui2v/ui2v/issues');
}
