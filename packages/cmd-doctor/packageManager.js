import { execSync } from 'child_process';

/**
 * Check package manager installation
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkPackageManager(options = {}) {
    const result = {
        name: 'Package manager',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        // Detect which package manager is being used
        let packageManager = 'npm';
        let version = '';

        // Check for yarn.lock
        try {
            const fs = await import('fs');
            if (fs.existsSync('yarn.lock')) {
                packageManager = 'yarn';
            } else if (fs.existsSync('pnpm-lock.yaml')) {
                packageManager = 'pnpm';
            }
        } catch (err) {
            // Default to npm
        }

        // Get version
        try {
            version = execSync(`${packageManager} --version`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            result.passed = true;
            result.message = `${packageManager} ${version} installed`;
            result.details = {
                manager: packageManager,
                version: version
            };
        } catch (error) {
            result.passed = false;
            result.message = `${packageManager} not found`;
            result.canFix = false;
            result.fixInstructions = `Please install ${packageManager}.\nVisit: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm`;
        }
    } catch (error) {
        result.passed = false;
        result.message = `Failed to check package manager: ${error.message}`;
    }

    return result;
}

export default checkPackageManager;
