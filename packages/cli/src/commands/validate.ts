import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import {
  type ValidationError,
  type ValidationWarning,
} from '@ui2v/core';
import { validateProjectJson } from './project';

interface ValidateOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function validateCommand(
  input: string,
  options: ValidateOptions
): Promise<void> {
  const spinner = options.json ? null : ora('Validating project...').start();

  try {
    if (!fs.existsSync(input)) {
      if (spinner) {
        spinner.fail(chalk.red(`Input file not found: ${input}`));
      } else {
        console.error(chalk.red(`Input file not found: ${input}`));
      }
      process.exit(1);
    }

    const projectJson = await fs.readFile(input, 'utf-8');
    const result = validateProjectJson(projectJson);

    spinner?.stop();

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            valid: result.valid,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
            errors: result.errors,
            warnings: options.verbose ? result.warnings : undefined,
          },
          null,
          2
        )
      );
    } else {
      if (result.valid) {
        console.log(chalk.green('OK Project is valid'));
      } else {
        console.log(chalk.red('ERROR Project has errors'));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red(`\n${result.errors.length} error(s):`));
        result.errors.forEach((error: ValidationError) => {
          console.log(chalk.red(`  - [${error.code}] ${error.message}`));
          if (error.path) {
            console.log(chalk.dim(`    at ${error.path}`));
          }
        });
      }

      if (options.verbose && result.warnings.length > 0) {
        console.log(chalk.yellow(`\n${result.warnings.length} warning(s):`));
        result.warnings.forEach((warning: ValidationWarning) => {
          console.log(chalk.yellow(`  - [${warning.code}] ${warning.message}`));
          if (warning.path) {
            console.log(chalk.dim(`    at ${warning.path}`));
          }
        });
      }
    }

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('Validation failed'));
    } else {
      console.error(chalk.red('Validation failed'));
    }
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
