import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Compare two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {boolean} True if v1 >= v2
 */
function versionGte(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return true;
        if (p1 < p2) return false;
    }

    return true; // Equal
}

/**
 * Check Node.js version
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkNodeVersion(options = {}) {
    const minVersion = options.minVersion || '18.0.0';
    const result = {
        name: 'Node.js version',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        const currentVersion = process.version.replace('v', '');
        const recommended = minVersion;

        result.details = {
            current: currentVersion,
            required: `>=${recommended}`
        };

        if (versionGte(currentVersion, recommended)) {
            result.passed = true;
            result.message = `v${currentVersion} (recommended: >=${recommended})`;
        } else {
            result.passed = false;
            result.message = `v${currentVersion} is below recommended version >=${recommended}`;
            result.canFix = false; // Cannot auto-fix Node.js version
            result.fixInstructions = `Please upgrade Node.js to version ${recommended} or higher.\nVisit: https://nodejs.org/`;
        }
    } catch (error) {
        result.passed = false;
        result.message = `Failed to check Node.js version: ${error.message}`;
    }

    return result;
}

export default checkNodeVersion;
