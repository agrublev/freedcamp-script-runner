import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Check fscripts.md file
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkFScriptsFile(options = {}) {
    const result = {
        name: 'fscripts.md file',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: true,
        fix: null
    };

    try {
        const fscriptsPath = path.join(process.cwd(), 'fscripts.md');

        if (await fs.pathExists(fscriptsPath)) {
            const stats = await fs.stat(fscriptsPath);
            result.passed = true;
            result.message = `Found (${formatBytes(stats.size)})`;
            result.details = {
                path: fscriptsPath,
                size: stats.size,
                sizeFormatted: formatBytes(stats.size)
            };
        } else {
            result.passed = false;
            result.message = 'Not found';
            result.canFix = true;
            result.fix = async () => {
                // Create a basic fscripts.md template
                const template = `# Scripts

## hello
Say hello

\`\`\`bash
echo "Hello from FSCR!"
\`\`\`
`;
                await fs.writeFile(fscriptsPath, template, 'utf8');
                return 'Created basic fscripts.md template';
            };
        }
    } catch (error) {
        result.passed = false;
        result.message = `Error checking file: ${error.message}`;
    }

    return result;
}

/**
 * Check package.json file
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkPackageJson(options = {}) {
    const result = {
        name: 'package.json',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        const packagePath = path.join(process.cwd(), 'package.json');

        if (await fs.pathExists(packagePath)) {
            const packageJson = await fs.readJson(packagePath);
            const fscrVersion = packageJson.version || 'unknown';

            result.passed = true;
            result.message = `Valid (fsr@${fscrVersion})`;
            result.details = {
                path: packagePath,
                version: fscrVersion,
                name: packageJson.name
            };
        } else {
            result.passed = false;
            result.message = 'Not found';
            result.canFix = false;
            result.fixInstructions = 'package.json is required. Please initialize your project with npm init.';
        }
    } catch (error) {
        result.passed = false;
        result.message = `Invalid or corrupted: ${error.message}`;
        result.canFix = false;
    }

    return result;
}


/**
 * Check file permissions
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkFilePermissions(options = {}) {
    const result = {
        name: 'File permissions',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: true,
        fix: null
    };

    try {
        const testFile = path.join(process.cwd(), '.fsr-permission-test');

        // Test write permission
        try {
            await fs.writeFile(testFile, 'test', 'utf8');
        } catch (writeError) {
            result.passed = false;
            result.message = 'No write access';
            result.canFix = false;
            result.fixInstructions = 'Please check directory permissions and ensure you have write access.';
            return result;
        }

        // Test read permission
        try {
            await fs.readFile(testFile, 'utf8');
        } catch (readError) {
            result.passed = false;
            result.message = 'No read access';
            result.canFix = false;
            result.fixInstructions = 'Please check directory permissions and ensure you have read access.';
            await fs.remove(testFile).catch(() => {});
            return result;
        }

        // Clean up test file
        await fs.remove(testFile);

        result.passed = true;
        result.message = 'Read/write access OK';
        result.details = {
            read: true,
            write: true
        };
    } catch (error) {
        result.passed = false;
        result.message = `Permission check failed: ${error.message}`;
    }

    return result;
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default {
    checkFScriptsFile,
    checkPackageJson,
    checkFilePermissions
};
