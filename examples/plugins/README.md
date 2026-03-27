# FSCR Plugin Examples

This directory contains example plugins demonstrating various features of the FSCR v7.0.0 plugin system.

## Available Examples

### 1. Hello World (`hello-world/`)

**Purpose:** Basic plugin structure and lifecycle

**Features:**
- Simple command registration
- Pre/post task hooks
- Basic logging

**Usage:**
```bash
fscr hello
fscr hello --name Alice
```

**Code highlights:**
```javascript
// Register a command
context.registerCommand({
  name: 'hello',
  description: 'Say hello',
  handler: async (options, ctx) => {
    ctx.logger.success(`Hello, ${options.name}!`);
  }
});

// Register hooks
context.registerHook('pre-task', async (data) => {
  context.logger.info(`Task starting: ${data.taskName}`);
});
```

---

### 2. Task Timer (`task-timer/`)

**Purpose:** Track and report task execution times

**Features:**
- Multiple hook usage
- Data persistence with storage
- Custom reporting command
- Task history tracking

**Usage:**
```bash
fscr timer              # Show last 10 tasks
fscr timer --limit 20   # Show last 20 tasks
fscr timer --task build # Stats for specific task
```

**Code highlights:**
```javascript
// Track execution times
const taskHistory = [];

context.registerHook('pre-task', async (data) => {
  taskTimes.set(data.taskName, { startTime: data.timestamp });
}, { priority: 'high' });

context.registerHook('post-task', async (data) => {
  taskHistory.push({
    taskName: data.taskName,
    duration: data.duration,
    success: data.success
  });
});
```

---

### 3. Task Notifier (`task-notifier/`)

**Purpose:** Send notifications for long-running tasks

**Features:**
- Conditional hook execution
- Error handling hooks
- Toggle commands
- Threshold-based notifications

**Usage:**
```bash
fscr notify --enable   # Enable notifications
fscr notify --disable  # Disable notifications
fscr notify --status   # Check status
```

**Code highlights:**
```javascript
context.registerHook('post-task', async (data) => {
  if (!notificationsEnabled) return;

  // Only notify for long-running tasks
  if (data.duration < longRunningThreshold) return;

  // Send notification
  context.logger.info(`[Notification] Task completed: ${data.taskName}`);
});
```

---

### 4. Deployment (`deployment/`)

**Purpose:** Advanced deployment workflow with validation

**Features:**
- Complex command with multiple options
- Command aliases
- Pre-deployment validation
- Dry-run mode
- Deployment history

**Usage:**
```bash
fscr deploy --env staging
fscr deploy --env prod --branch main
fscr deploy --env dev --dry-run
fscr ship --env prod              # Using alias
fscr deploy-history               # View history
```

**Code highlights:**
```javascript
// Pre-deployment validation
context.registerHook('pre-command', async (data) => {
  if (data.command === 'deploy') {
    context.logger.info('Running pre-deployment checks...');
    // Validate environment, git status, etc.
  }
}, { priority: 'highest' });

// Command with validation
context.registerCommand({
  name: 'deploy',
  aliases: ['ship', 'publish'],
  options: [
    { flags: '-e, --env <environment>', required: true },
    { flags: '--dry-run', description: 'Simulate deployment' }
  ],
  handler: async (options, ctx) => {
    // Deployment logic
  }
});
```

---

## Installation

### Local Installation

1. Copy a plugin directory to `.fscr/plugins/`:
```bash
mkdir -p .fscr/plugins
cp -r examples/plugins/hello-world .fscr/plugins/
```

2. Enable the plugin in your config:
```json
{
  "fscripts": {
    "plugins": {
      "enabledPlugins": ["hello-world"]
    }
  }
}
```

3. Run FSCR:
```bash
fscr hello
```

### Testing Examples

Run the examples in this directory:

```bash
# Test hello-world
node -e "import('./hello-world/index.js').then(m => m.default.init({
  version: '7.0.0',
  cwd: process.cwd(),
  logger: console,
  cache: new Map(),
  registerCommand: (cmd) => console.log('Command registered:', cmd.name),
  registerHook: (event, handler) => console.log('Hook registered:', event)
}))"
```

## Creating Your Own Plugin

Use these examples as templates:

1. **Start with hello-world** - Learn basic structure
2. **Study task-timer** - Understand data persistence
3. **Review task-notifier** - See conditional execution
4. **Examine deployment** - Learn complex commands

### Basic Template

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  author: 'Your Name',

  async init(context) {
    context.logger.info('Plugin initializing...');

    // Register commands
    context.registerCommand({
      name: 'my-command',
      description: 'My custom command',
      handler: async (options, ctx) => {
        ctx.logger.success('Command executed!');
      }
    });

    // Register hooks
    context.registerHook('pre-task', async (data, ctx) => {
      ctx.logger.info(`Task: ${data.taskName}`);
    });

    context.logger.success('Plugin initialized');
  },

  async destroy() {
    // Cleanup resources
  }
};
```

## Documentation

- [Plugin Development Guide](../../docs/PLUGIN_DEVELOPMENT.md)
- [API Reference](../../docs/PLUGIN_API.md)

## Plugin Ideas

Here are some ideas for plugins you could build:

1. **Test Coverage Reporter** - Track test coverage over time
2. **Git Branch Validator** - Enforce branch naming conventions
3. **Environment Switcher** - Quickly switch between env files
4. **Task Dependencies** - Define task execution order
5. **Performance Monitor** - Track task performance metrics
6. **CI/CD Integration** - Integrate with GitHub Actions, GitLab CI
7. **Database Migration Runner** - Run migrations before tasks
8. **Docker Integration** - Build/push Docker images
9. **Log Aggregator** - Centralize logs from all tasks
10. **Security Scanner** - Scan for security issues before deployment

## Contributing

Found an issue or have an improvement? Please open an issue or PR!

---

**Happy Plugin Development! 🚀**
