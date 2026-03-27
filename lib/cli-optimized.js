/**
 * Optimized CLI Entry Point for FSCR v7.0.0
 *
 * Performance optimizations:
 * - Lazy loading of commands (loaded on-demand)
 * - TTL cache for parsed scripts
 * - Minimal startup dependencies
 * - Performance monitoring
 *
 * Target: <50ms startup time
 */

import { performance } from 'perf_hooks';
import { getLazyLoader, registerLazyModule } from './performance/lazy-loader.js';
import { getMonitor } from './performance/monitor.js';
import { getCache } from './performance/cache.js';

// Start performance monitoring
const monitor = getMonitor();
const startTime = performance.now();
monitor.startupBegin();

// Initialize lazy loader
const loader = getLazyLoader();

// Register lazy-loadable modules (not loaded yet!)
registerLazyModule('bump', () => import('./release/bump.js'));
registerLazyModule('generators', () => import('./generators/index.js'));
registerLazyModule('parseScriptFile', () => import('./parsers/parseScriptsMd.js'));
registerLazyModule('upgradePackages', () => import('./upgradePackages.js'));
registerLazyModule('running', () => import('./running/index.js'));
registerLazyModule('startScripts', () => import('./startScripts.js'));
registerLazyModule('optionList', () => import('./optionList.js'));
registerLazyModule('validateNotInDev', () => import('./git/validateNotDev.js'));
registerLazyModule('encryption', () => import('./encryption/encryption.js'));
registerLazyModule('authConfig', () => import('./auth/auth-conf.js'));
registerLazyModule('chalk', () => import('chalk'));
registerLazyModule('yargs', () => import('yargs'));

// Minimal imports needed for startup
import { clear } from './utils/index.js';
import './utils/console.js';

/**
 * Create command handler that lazy-loads dependencies
 */
function createLazyHandler(loaderFn) {
    return async function (...args) {
        const cmdStart = performance.now();
        try {
            await loaderFn(...args);
            const cmdDuration = performance.now() - cmdStart;
            monitor.trackCommand(loaderFn.name, cmdDuration, true);
        } catch (error) {
            const cmdDuration = performance.now() - cmdStart;
            monitor.trackCommand(loaderFn.name, cmdDuration, false);
            throw error;
        }
    };
}

/**
 * Initialize CLI with lazy-loaded yargs
 */
async function initializeCLI() {
    const yargs = (await loader.load('yargs')).default;
    const chalk = (await loader.load('chalk')).default;

    // Styled text helpers
    const taskName = chalk.rgb(39, 173, 96).bold.underline;
    const textDescription = chalk.rgb(159, 161, 181);

    const yargsInstance = yargs(process.argv.slice(2))
        .usage('Usage: $0 <command> [options]')

        // Branch command
        .command(
            'branch',
            'Create new branch instead of Development',
            () => {},
            createLazyHandler(async () => {
                const { default: validateNotInDev } = await loader.load('validateNotInDev');
                await validateNotInDev();
            })
        )
        .example(`${taskName('$0')}`, `${textDescription('Validates branch and creates new')}`)

        // Start command
        .command(
            'start',
            'Choose category then task to run',
            () => {},
            createLazyHandler(async () => {
                const { startScripts } = await loader.load('startScripts');
                await startScripts();
            })
        )
        .example(`${taskName('$0 start')}`, `${textDescription('Open a task selection selector')}`)

        // Scripts command
        .command(
            'scripts',
            'Choose a script from package.json',
            () => {},
            createLazyHandler(async () => {
                const { startPackageScripts } = await loader.load('startScripts');
                await startPackageScripts();
            })
        )
        .example(`${taskName('$0 scripts')}`, `${textDescription('Choose a script from package.json')}`)

        // List command
        .command(
            'list',
            'Select any task with text autocompletion',
            () => {},
            createLazyHandler(async () => {
                const { startScripts } = await loader.load('startScripts');
                await startScripts(false);
            })
        )
        .example(`${taskName('$0 list')}`, `${textDescription('Show you all tasks you can run')}`)

        // Run command
        .command(
            'run [task]',
            'Run a specific task',
            (yargs) => {
                yargs.positional('task', {
                    describe: 'name of task to start',
                    default: ''
                });
            },
            createLazyHandler(async (argv) => {
                const { task } = argv;
                const chalk = (await loader.load('chalk')).default;
                const parseScriptFile = (await loader.load('parseScriptFile')).default;
                const { runCLICommand } = await loader.load('running');

                // Check cache first
                const cache = getCache();
                let allTasks = await cache.get('allTasks');

                if (!allTasks) {
                    const parsed = await parseScriptFile();
                    allTasks = parsed.allTasks;
                    await cache.set('allTasks', allTasks);
                }

                const taskData = allTasks.find((t) => t.name === task);
                if (!taskData) {
                    console.error(`${chalk.bold.underline.red('Task not found')}`);
                    return;
                }

                let { script, lang } = taskData;

                if (lang === 'javascript') {
                    await runCLICommand({
                        task: { name: task },
                        script: { lang, env: {}, type: 'node', full: script, rest: [] }
                    });
                } else {
                    let pars = script.split(' ');
                    let type = pars[0];
                    let env = {};

                    if (pars[0].includes('=')) {
                        let envs = type.split('=');
                        env[envs[0]] = envs[1];
                        type = pars[1];
                        pars.shift();
                        pars.shift();
                        script = pars.join(' ');
                    } else {
                        pars.shift();
                        script = pars.join(' ');
                    }

                    await runCLICommand({
                        task: { name: task },
                        script: { lang, env, type, full: script, rest: script.split(' ') }
                    });
                }
            })
        )
        .example(`${taskName('$0 run start:web')}`, `${textDescription("Run task 'start:web'")}`)

        // Upgrade command
        .command(
            'upgrade',
            "Upgrade all your packages except ones specified by 'ignore-upgrade':[]",
            () => {},
            createLazyHandler(async () => {
                const upgradePackages = (await loader.load('upgradePackages')).default;
                await upgradePackages();
            })
        )
        .example(`${taskName('$0 upgrade')}`, `${textDescription('Upgraded!')}`)

        // Bump command
        .command(
            'bump',
            'Bump package.json and beautify it!',
            () => {},
            createLazyHandler(async (argv) => {
                const bump = (await loader.load('bump')).default;
                await bump(argv.type, argv.skipGit === 'true');
            })
        )
        .example(`${taskName('$0 bump')}`, `${textDescription('BUMPED AND PRETTY!')}`)

        // Run-s command
        .command(
            'run-s',
            'Run a set of tasks one after another',
            () => {},
            createLazyHandler(async (argv) => {
                const tasks = argv._.slice(1);
                const parseScriptFile = (await loader.load('parseScriptFile')).default;
                const { runSequence } = await loader.load('running');
                const FcScripts = await parseScriptFile();
                await runSequence(tasks, FcScripts);
            })
        )
        .example(
            `${taskName('$0 run-s start:web start:desktop')}`,
            `${textDescription("Run task 'start:web' and afterwards 'start:desktop'")}`
        )

        // Run-p command
        .command(
            'run-p',
            'Run tasks in parallel',
            () => {},
            createLazyHandler(async (argv) => {
                const tasks = argv._.slice(1);
                const parseScriptFile = (await loader.load('parseScriptFile')).default;
                const { runParallel } = await loader.load('running');
                const FcScripts = await parseScriptFile();
                await runParallel(tasks, FcScripts);
            })
        )
        .example(
            `${taskName('$0 run-p start:web start:desktop')}`,
            `${textDescription("Run task 'start:web' and at the same time 'start:desktop'")}`
        )

        // Remote command
        .command(
            'remote',
            'Get remote configuration',
            () => {},
            createLazyHandler(async () => {
                const authConfig = (await loader.load('authConfig')).default;
                await authConfig().catch(console.error);
            })
        )
        .example(`${taskName('$0 remote')}`, `${textDescription('Get remote config')}`)

        // Encryption command
        .command(
            'encryption',
            'Encrypt/Decrypt secret files',
            () => {},
            createLazyHandler(async () => {
                const encrypt = (await loader.load('encryption')).default;
                await encrypt.init();
            })
        )
        .example(`${taskName('$0 encryption')}`, `${textDescription('Encrypt/Decrypt secret files')}`)

        // Clear command
        .command(
            'clear',
            'Clear recent task history',
            () => {},
            createLazyHandler(async () => {
                const { clearRecent } = await loader.load('startScripts');
                await clearRecent();
            })
        )
        .example(`${taskName('$0 clear')}`, `${textDescription('Clear your recently run tasks')}`)

        // Generate command
        .command(
            'generate',
            'Generate a sample fscripts.md file from the package.json',
            () => {},
            createLazyHandler(async () => {
                const { generateFScripts } = await loader.load('generators');
                await generateFScripts();
            })
        )
        .example(
            `${taskName('$0 generate')}`,
            `${textDescription('Generates a sample.fscripts.md you can use as template')}`
        )

        // TOC command
        .command(
            'toc',
            'Generate updated Table of Contents on top of the fscripts.md file',
            () => {},
            createLazyHandler(async (argv) => {
                const { generateToc } = await loader.load('generators');
                await generateToc(argv._[1]);
            })
        )
        .example(
            `${taskName('$0 toc')}`,
            `${textDescription('Generate updated Table of Contents')}`
        )

        // Performance stats command (new in v7.0.0)
        .command(
            'perf',
            'Show performance statistics',
            () => {},
            async () => {
                monitor.printReport();
            }
        )
        .example(`${taskName('$0 perf')}`, `${textDescription('Show performance metrics')}`)

        .help();

    return yargsInstance;
}

/**
 * Main CLI execution
 */
async function main() {
    clear();

    const yargsInstance = await initializeCLI();
    const argv = yargsInstance.argv;

    // Mark startup complete
    monitor.startupEnd();

    // If no command, show interactive menu
    if (argv && argv._ && argv._.length === 0) {
        const optionList = (await loader.load('optionList')).default;
        const choice = await optionList();

        if (choice) {
            const { spawn } = await import('child_process');
            await new Promise((resolve) => {
                const shell = spawn('yarn', ['fsr', choice], {
                    stdio: 'inherit',
                    cwd: process.cwd(),
                    env: { ...process.env, FORCE_COLOR: true }
                });
                shell.on('close', resolve);
            });
        } else {
            const chalk = (await loader.load('chalk')).default;
            console.log(chalk.green.bold('See you soon!'));
        }
    }
}

// Run CLI
main().catch(console.error);

export { initializeCLI, main };
