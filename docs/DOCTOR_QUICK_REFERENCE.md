# Doctor Command - Quick Reference

## Commands

```bash
fscr doctor             # Run all diagnostics
fscr doctor --fix       # Auto-fix issues
fscr doctor --json      # JSON output
fscr doctor --verbose   # Verbose mode
```

## Checks Performed

| Check | Critical | Auto-Fix | Description |
|-------|----------|----------|-------------|
| Node.js version | ✅ | ❌ | Requires >=18.0.0 |
| Package manager | ✅ | ❌ | Detects npm/yarn/pnpm |
| Git | ❌ | ❌ | Checks installation |
| fscripts.md | ❌ | ✅ | Creates template |
| package.json | ✅ | ❌ | Validates structure |
| TypeScript | ❌ | ✅ | Optional dependency |
| File permissions | ✅ | Limited | Read/write access |
| Cache system | ❌ | ✅ | Creates directory |
| Startup time | ❌ | ❌ | Target: <50ms |
| Memory usage | ❌ | ❌ | Target: <50MB |

## Status Icons

- ✅ **Passed**: Check successful
- ⚠️ **Warning**: Non-critical issue
- ❌ **Error**: Failed check

## Exit Codes

- `0`: Success or warnings only
- `1`: Critical failures

## Common Issues

### Issue: "TypeScript not installed"
```bash
fscr doctor --fix  # Installs TypeScript
```

### Issue: "Cache directory does not exist"
```bash
fscr doctor --fix  # Creates cache directory
```

### Issue: "High startup time"
```bash
rm -rf ~/.fscr/cache  # Clear cache
```

### Issue: "Node.js version too low"
```bash
# Visit https://nodejs.org/ and upgrade
nvm install 20  # If using nvm
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: FSCR Health Check
  run: fscr doctor --json > health-report.json
```

### GitLab CI
```yaml
health-check:
  script:
    - fscr doctor
```

## Programmatic Usage

```javascript
import doctor from './lib/commands/doctor.js';

const result = await doctor({ json: true });

if (!result.passed) {
  console.error('Health check failed');
  process.exit(1);
}
```

## File Locations

- **Cache**: `~/.fscr/cache`
- **Config**: `./fscripts.md`, `./package.json`
- **Diagnostics**: `./lib/diagnostics/*.js`

## Help

```bash
fscr doctor --help      # Show help
fscr --help             # Main help
```

## Quick Troubleshooting

1. Run `fscr doctor` to identify issues
2. Try `fscr doctor --fix` for auto-fixes
3. Check `~/.fscr/cache` permissions
4. Verify Node.js version >= 18.0.0
5. Ensure package.json is valid JSON
6. Check for peer dependency conflicts

## Performance Tips

- Clear cache regularly
- Keep Node.js updated
- Minimize plugins/hooks
- Use fast package manager (pnpm)
- Monitor memory usage

## Related Commands

```bash
fscr --version          # Check version
fscr list               # List tasks
fscr generate           # Generate fscripts.md
fscr clear              # Clear recent history
```
