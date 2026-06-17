import chalk from 'chalk';
import boxen from 'boxen';
import { checkNodeVersion } from '../diagnostics/nodeVersion.js';
import { checkPackageManager } from '../diagnostics/packageManager.js';
import { checkGit } from '../diagnostics/gitCheck.js';
import {
    checkFScriptsFile,
    checkPackageJson,
    checkFilePermissions
} from '../diagnostics/fileSystem.js';
import { checkCache } from '../diagnostics/cache.js';
import { checkStartupTime, checkMemoryUsage } from '../diagnostics/performance.js';

/**
 * Run all diagnostic checks
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Results object
 */
export async function runDiagnostics(options = {}) {
    const { fix = false, json = false } = options;

    console.log(chalk.cyan.bold('\n🔍 Running FSCR diagnostics...\n'));

    const checks = [
        { name: 'nodeVersion', fn: checkNodeVersion, critical: true },
        { name: 'packageManager', fn: checkPackageManager, critical: true },
        { name: 'git', fn: checkGit, critical: false },
        { name: 'fscriptsFile', fn: checkFScriptsFile, critical: false },
        { name: 'packageJson', fn: checkPackageJson, critical: true },
        { name: 'filePermissions', fn: checkFilePermissions, critical: true },
        { name: 'cache', fn: checkCache, critical: false },
        { name: 'startupTime', fn: checkStartupTime, critical: false },
        { name: 'memoryUsage', fn: checkMemoryUsage, critical: false }
    ];

    const results = [];
    let passedCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let fixedCount = 0;

    for (const check of checks) {
        try {
            const result = await check.fn();
            results.push({ ...result, critical: check.critical });

            // Display result
            displayCheckResult(result);

            // Count results
            if (result.passed && !result.warning) {
                passedCount++;
            } else if (result.warning) {
                warningCount++;
            } else {
                errorCount++;
            }

            // Auto-fix if requested
            if (fix && !result.passed && result.canFix && result.fix) {
                try {
                    console.log(chalk.yellow(`   Attempting to fix...`));
                    const fixMessage = await result.fix();
                    console.log(chalk.green(`   ✓ Fixed: ${fixMessage}\n`));
                    fixedCount++;
                } catch (fixError) {
                    console.log(chalk.red(`   ✗ Fix failed: ${fixError.message}\n`));
                }
            } else if (!result.passed && result.fixInstructions) {
                console.log(chalk.gray(`   ${result.fixInstructions}\n`));
            }
        } catch (error) {
            console.log(
                chalk.red(`❌ ${check.name}\n   Error: ${error.message}\n`)
            );
            errorCount++;
            results.push({
                name: check.name,
                passed: false,
                error: error.message,
                critical: check.critical
            });
        }
    }

    // Display summary (skip if JSON mode)
    if (!json) {
        displaySummary(passedCount, warningCount, errorCount, fixedCount);
    }

    // Return results object
    return {
        passed: errorCount === 0,
        summary: {
            passed: passedCount,
            warnings: warningCount,
            errors: errorCount,
            fixed: fixedCount,
            total: checks.length
        },
        results
    };
}

/**
 * Display check result
 * @param {Object} result - Check result
 */
function displayCheckResult(result) {
    let icon = '✅';
    let color = 'green';

    if (!result.passed) {
        icon = '❌';
        color = 'red';
    } else if (result.warning) {
        icon = '⚠️ ';
        color = 'yellow';
    }

    console.log(chalk[color](`${icon} ${result.name}`));
    console.log(chalk.gray(`   ${result.message}\n`));
}

/**
 * Display summary
 * @param {number} passed - Number of passed checks
 * @param {number} warnings - Number of warnings
 * @param {number} errors - Number of errors
 * @param {number} fixed - Number of fixed issues
 */
function displaySummary(passed, warnings, errors, fixed) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Summary:'));

    if (passed > 0) {
        console.log(chalk.green(`  ✅ Passed: ${passed}`));
    }

    if (warnings > 0) {
        console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}`));
    }

    if (errors > 0) {
        console.log(chalk.red(`  ❌ Errors: ${errors}`));
    }

    if (fixed > 0) {
        console.log(chalk.cyan(`  🔧 Fixed: ${fixed}`));
    }

    console.log(chalk.gray('─'.repeat(50)));

    // Overall status
    if (errors === 0 && warnings === 0) {
        console.log(
            boxen(chalk.green.bold('✓ All checks passed!'), {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green'
            })
        );
    } else if (errors === 0) {
        console.log(
            boxen(chalk.yellow.bold('⚠ System operational with warnings'), {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'yellow'
            })
        );
    } else {
        console.log(
            boxen(chalk.red.bold('✗ Issues found - please review above'), {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'red'
            })
        );
        console.log(
            chalk.gray(
                '\nTip: Run "fsr doctor --fix" to automatically fix some issues\n'
            )
        );
    }
}

/**
 * Doctor command handler
 * @param {Object} argv - Command arguments
 */
export default async function doctor(argv) {
    try {
        const options = {
            fix: argv.fix || false,
            json: argv.json || false
        };

        const result = await runDiagnostics(options);

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }

        // Exit with error code if there are critical failures
        if (!result.passed) {
            const criticalFailures = result.results.filter(
                (r) => !r.passed && r.critical
            );
            if (criticalFailures.length > 0) {
                process.exit(1);
            }
        }
    } catch (error) {
        console.error(chalk.red.bold(`\n❌ Doctor command failed: ${error.message}\n`));
        if (argv.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}
