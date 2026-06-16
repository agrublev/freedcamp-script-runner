/**
 * Task Timer Plugin
 * Tracks and reports task execution times
 */

export default {
  name: 'task-timer',
  version: '1.0.0',
  description: 'Track task execution times and generate reports',
  author: 'FSCR Team',
  minFscrVersion: '7.0.0',

  async init(context) {
    const taskTimes = new Map();
    const taskHistory = [];

    // Track task start times
    context.registerHook('pre-task', async (data) => {
      taskTimes.set(data.taskName, {
        startTime: data.timestamp,
        args: data.args
      });
    }, { priority: 'high' });

    // Track task completion
    context.registerHook('post-task', async (data) => {
      const startData = taskTimes.get(data.taskName);
      if (startData) {
        const record = {
          taskName: data.taskName,
          duration: data.duration,
          success: data.success,
          timestamp: data.timestamp,
          args: startData.args
        };

        taskHistory.push(record);

        // Keep only last 100 records
        if (taskHistory.length > 100) {
          taskHistory.shift();
        }

        taskTimes.delete(data.taskName);
      }
    }, { priority: 'low' });

    // Register timer command
    context.registerCommand({
      name: 'timer',
      description: 'View task execution time statistics',
      options: [
        {
          flags: '-l, --limit <number>',
          description: 'Number of recent tasks to show',
          defaultValue: '10'
        },
        {
          flags: '-t, --task <name>',
          description: 'Show stats for specific task'
        }
      ],
      handler: async (options, ctx) => {
        const limit = parseInt(options.limit, 10);
        const taskFilter = options.task;

        if (taskHistory.length === 0) {
          ctx.logger.info('No task history available');
          return;
        }

        let filtered = taskHistory;
        if (taskFilter) {
          filtered = taskHistory.filter(r => r.taskName === taskFilter);
        }

        const recent = filtered.slice(-limit);

        ctx.logger.info('Task Execution History:');
        ctx.logger.info('─'.repeat(60));

        for (const record of recent) {
          const status = record.success ? '✓' : '✗';
          const date = new Date(record.timestamp).toLocaleTimeString();
          ctx.logger.info(
            `${status} ${record.taskName} - ${record.duration}ms (${date})`
          );
        }

        ctx.logger.info('─'.repeat(60));

        // Calculate average
        if (filtered.length > 0) {
          const avg = filtered.reduce((sum, r) => sum + r.duration, 0) / filtered.length;
          const successRate = (filtered.filter(r => r.success).length / filtered.length) * 100;

          ctx.logger.info(`Average duration: ${avg.toFixed(2)}ms`);
          ctx.logger.info(`Success rate: ${successRate.toFixed(1)}%`);
        }
      },
      examples: [
        'fsr timer',
        'fsr timer --limit 20',
        'fsr timer --task build'
      ]
    });

    // Store history in plugin storage
    context.setStorage({ taskHistory });

    context.logger.success('Task Timer plugin initialized');
  }
};
