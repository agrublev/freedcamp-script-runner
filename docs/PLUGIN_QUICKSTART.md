# Plugin System - Quick Start Guide

Get started with FSCR v7.0.0 plugins in 5 minutes!

## 1. Create Your First Plugin

Create a new directory for your plugin:

```bash
mkdir -p .fsr/plugins/my-first-plugin
cd .fsr/plugins/my-first-plugin
```

Create `index.js`:

```javascript
export default {
  name: 'my-first-plugin',
  version: '1.0.0',
  description: 'My first FSCR plugin',

  async init(context) {
    context.logger.info('🎉 My first plugin is loading!');

    // Add a custom command
    context.registerCommand({
      name: 'greet',
      description: 'Greet someone',
      options: [
        {
          flags: '-n, --name <name>',
          description: 'Name to greet',
          defaultValue: 'World'
        }
      ],
      handler: async (options, ctx) => {
        const name = options.name || 'World';
        ctx.logger.success(`👋 Hello, ${name}!`);
      },
      examples: [
        'fsr greet',
        'fsr greet --name Alice'
      ]
    });

    context.logger.success('✅ Plugin loaded successfully!');
  }
};
```

## 2. Enable Your Plugin

Edit your `package.json` or create `.fsr/config.json`:

```json
{
  "fscripts": {
    "plugins": {
      "enabledPlugins": ["my-first-plugin"]
    }
  }
}
```

## 3. Use Your Plugin

```bash
fsr greet
# Output: 👋 Hello, World!

fsr greet --name Alice
# Output: 👋 Hello, Alice!
```

## 4. Add Lifecycle Hooks

Update your plugin to track tasks:

```javascript
export default {
  name: 'my-first-plugin',
  version: '1.0.0',

  async init(context) {
    // Track task execution
    context.registerHook('pre-task', async (data, ctx) => {
      ctx.logger.info(`🚀 Starting task: ${data.taskName}`);
    });

    context.registerHook('post-task', async (data, ctx) => {
      const emoji = data.success ? '✅' : '❌';
      ctx.logger.info(
        `${emoji} Task ${data.taskName} completed in ${data.duration}ms`
      );
    });

    // Your command from before
    context.registerCommand({
      name: 'greet',
      description: 'Greet someone',
      handler: async (options, ctx) => {
        ctx.logger.success('👋 Hello, World!');
      }
    });
  }
};
```

Now when you run any task:

```bash
fsr run build
# Output:
# 🚀 Starting task: build
# ... build output ...
# ✅ Task build completed in 1234ms
```

## 5. Store Persistent Data

Track how many times a command is used:

```javascript
export default {
  name: 'usage-tracker',
  version: '1.0.0',

  async init(context) {
    // Load saved data
    const data = context.getStorage() || { count: 0 };

    context.registerCommand({
      name: 'stats',
      description: 'Show usage statistics',
      handler: async (options, ctx) => {
        data.count++;
        context.setStorage(data);

        ctx.logger.info(`This command has been run ${data.count} times`);
      }
    });
  }
};
```

## 6. Next Steps

**Try the examples:**
- Copy `/examples/plugins/hello-world/` to learn basic structure
- Study `/examples/plugins/task-timer/` for data persistence
- Review `/examples/plugins/deployment/` for advanced commands

**Read the docs:**
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md) - Complete guide
- [API Reference](./PLUGIN_API.md) - Full API documentation

**Build something cool:**
- Test coverage reporter
- Git hooks integration
- Slack notifications
- Environment validator
- Docker deployment
- Database migrations
- Performance monitoring

## Common Patterns

### Pattern 1: Validation Hook

Prevent tasks from running if conditions aren't met:

```javascript
context.registerHook('pre-task', async (data, ctx) => {
  if (data.taskName === 'deploy') {
    // Check git status
    const status = execSync('git status --porcelain').toString();
    if (status.trim()) {
      ctx.logger.error('Git working directory is dirty!');
      throw new Error('Commit changes before deploying');
    }
  }
}, { priority: 'highest' });
```

### Pattern 2: Notifications

Send notifications for long-running tasks:

```javascript
context.registerHook('post-task', async (data, ctx) => {
  // Only for tasks > 5 seconds
  if (data.duration > 5000) {
    const title = data.success ? 'Task Completed' : 'Task Failed';
    await sendNotification(title, `${data.taskName} (${data.duration}ms)`);
  }
});
```

### Pattern 3: Environment Switcher

Quickly switch environment files:

```javascript
context.registerCommand({
  name: 'env',
  description: 'Switch environment',
  options: [
    { flags: '-s, --switch <env>', description: 'Switch to env' }
  ],
  handler: async (options, ctx) => {
    const env = options.switch;
    const source = `.env.${env}`;
    const target = '.env';

    await fs.copyFile(source, target);
    ctx.logger.success(`Switched to ${env} environment`);
  }
});
```

### Pattern 4: Task Dependencies

Ensure tasks run in order:

```javascript
context.registerHook('pre-task', async (data, ctx) => {
  const dependencies = {
    'deploy': ['build', 'test'],
    'test': ['build']
  };

  const deps = dependencies[data.taskName];
  if (deps) {
    ctx.logger.info(`Running dependencies: ${deps.join(', ')}`);
    for (const dep of deps) {
      await ctx.runTask(dep);
    }
  }
});
```

## Debugging Tips

### Enable Debug Logging

```bash
DEBUG=fsr:* fsr run build
```

### Check Plugin Status

```javascript
// Add to your plugin
context.logger.debug('Plugin state:', context.getStorage());
```

### Test Hooks

```javascript
context.registerHook('pre-task', async (data, ctx) => {
  ctx.logger.debug('Hook data:', data);
});
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin name matches directory name
2. Ensure `index.js` exists
3. Verify plugin is in `enabledPlugins` config
4. Check for syntax errors

### Hook Not Firing

1. Verify hook event name is correct
2. Check hook is registered in `init()`
3. Ensure plugin loaded successfully
4. Add debug logging

### Command Not Found

1. Check command name is unique
2. Verify `registerCommand()` is called
3. Ensure plugin initialized
4. Check for typos

## Resources

- 📚 [Full Documentation](./PLUGIN_DEVELOPMENT.md)
- 🔍 [API Reference](./PLUGIN_API.md)
- 💡 [Examples](/examples/plugins/)
- 🐛 [Report Issues](https://github.com/agrublev/freedcamp-script-runner/issues)

---

**Ready to build? Start coding! 🚀**
