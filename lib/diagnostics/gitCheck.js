import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Check Git installation
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkGit(options = {}) {
    const result = {
        name: 'Git',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        const version = execSync('git --version', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        result.passed = true;
        result.message = version;
        result.details = {
            version: version
        };
    } catch (error) {
        result.passed = false;
        result.message = 'Not installed';
        result.canFix = false;
        result.fixInstructions = 'Please install Git.\nVisit: https://git-scm.com/downloads';
    }

    return result;
}

export default checkGit;
