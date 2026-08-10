/**
 * Hello World Plugin
 * Simple example plugin that demonstrates basic plugin features
 */

export default {
  name: 'hello-world',
  version: '1.0.0',
  description: 'A simple hello world plugin',
  author: 'FSCR Team',

  async init(context) {
    context.logger.info('Hello World plugin initializing...');

    // Register a custom command
    context.registerCommand({
      name: 'hello',
      description: 'Say hello',
      options: [
        {
          flags: '-n, --name <name>',
          description: 'Name to greet',
          defaultValue: 'World'
        }
      ],
      handler: async (options, ctx) => {
        const name = options.name || 'World';
        ctx.logger.success(`Hello, ${name}!`);
        ctx.logger.info(`FSCR version: ${context.version}`);
      },
      examples: [
        'fsr hello',
        'fsr hello --name Alice',
        'fsr hello -n Bob'
      ]
    });

    // Register a pre-task hook
    context.registerHook('pre-task', async (data) => {
      context.logger.info(`Task starting: ${data.taskName}`);
    });

    // Register a post-task hook
    context.registerHook('post-task', async (data) => {
      const status = data.success ? 'SUCCESS' : 'FAILED';
      context.logger.info(
        `Task completed: ${data.taskName} [${status}] (${data.duration}ms)`
      );
    });
  },

  async destroy() {
    console.log('Hello World plugin shutting down');
  }
};
