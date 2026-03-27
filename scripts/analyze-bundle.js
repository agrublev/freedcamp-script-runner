/**
 * Bundle Size Analyzer for FSCR v7.0.0
 *
 * Analyzes dist/ directory and reports on bundle size,
 * file count, and provides optimization recommendations.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

class BundleAnalyzer {
    constructor() {
        this.files = [];
        this.stats = {
            totalSize: 0,
            totalFiles: 0,
            largestFiles: [],
            filesByType: {}
        };
        this.targets = {
            totalSize: 1.2 * 1024 * 1024, // 1.2MB
            maxFileSize: 200 * 1024 // 200KB per file
        };
    }

    /**
     * Format bytes to human-readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    /**
     * Scan directory recursively
     */
    async scanDirectory(dir, basePath = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                await this.scanDirectory(fullPath, relativePath);
            } else if (entry.isFile()) {
                const stats = await fs.stat(fullPath);
                const ext = path.extname(entry.name);

                this.files.push({
                    path: relativePath,
                    size: stats.size,
                    ext: ext
                });

                this.stats.totalSize += stats.size;
                this.stats.totalFiles++;

                // Track by file type
                if (!this.stats.filesByType[ext]) {
                    this.stats.filesByType[ext] = {
                        count: 0,
                        size: 0
                    };
                }
                this.stats.filesByType[ext].count++;
                this.stats.filesByType[ext].size += stats.size;
            }
        }
    }

    /**
     * Analyze bundle
     */
    async analyze() {
        const distPath = path.join(projectRoot, 'dist');

        try {
            await this.scanDirectory(distPath);

            // Sort files by size
            this.files.sort((a, b) => b.size - a.size);
            this.stats.largestFiles = this.files.slice(0, 10);

            return this.stats;
        } catch (error) {
            throw new Error(`Failed to analyze bundle: ${error.message}`);
        }
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];

        // Check total size
        if (this.stats.totalSize > this.targets.totalSize) {
            const excess = this.stats.totalSize - this.targets.totalSize;
            recommendations.push({
                severity: 'ERROR',
                message: `Bundle size exceeds target by ${this.formatBytes(excess)}`,
                suggestion: 'Consider removing unused dependencies or enabling minification'
            });
        }

        // Check for large files
        for (const file of this.stats.largestFiles) {
            if (file.size > this.targets.maxFileSize) {
                recommendations.push({
                    severity: 'WARNING',
                    message: `Large file detected: ${file.path} (${this.formatBytes(file.size)})`,
                    suggestion: 'Consider code splitting or lazy loading'
                });
            }
        }

        // Check for duplicate or unnecessary files
        const jsSize = this.stats.filesByType['.js']?.size || 0;
        const mapSize = this.stats.filesByType['.map']?.size || 0;

        if (mapSize > jsSize * 0.5) {
            recommendations.push({
                severity: 'INFO',
                message: 'Source maps are large',
                suggestion: 'Consider removing source maps from production build'
            });
        }

        return recommendations;
    }

    /**
     * Print detailed report
     */
    printReport() {
        console.log('\n═══════════════════════════════════════════════════');
        console.log('           Bundle Size Analysis Report');
        console.log('═══════════════════════════════════════════════════\n');

        // Overall stats
        console.log('OVERALL STATISTICS:');
        console.log(`  Total Size: ${this.formatBytes(this.stats.totalSize)}`);
        console.log(`  Target Size: ${this.formatBytes(this.targets.totalSize)}`);
        console.log(`  Total Files: ${this.stats.totalFiles}`);

        const sizeDiff = this.stats.totalSize - this.targets.totalSize;
        const status = sizeDiff <= 0 ? '✓ PASS' : '✗ FAIL';
        const diffStr = sizeDiff > 0
            ? `(+${this.formatBytes(sizeDiff)} over target)`
            : `(${this.formatBytes(-sizeDiff)} under target)`;

        console.log(`  Status: ${status} ${diffStr}\n`);

        // File types breakdown
        console.log('FILE TYPES:');
        const sortedTypes = Object.entries(this.stats.filesByType)
            .sort((a, b) => b[1].size - a[1].size);

        for (const [ext, data] of sortedTypes) {
            const percentage = (data.size / this.stats.totalSize * 100).toFixed(1);
            console.log(`  ${ext || 'no extension'}: ${this.formatBytes(data.size)} (${percentage}%) - ${data.count} files`);
        }

        // Largest files
        console.log('\nLARGEST FILES:');
        for (const file of this.stats.largestFiles.slice(0, 5)) {
            const percentage = (file.size / this.stats.totalSize * 100).toFixed(1);
            console.log(`  ${file.path}: ${this.formatBytes(file.size)} (${percentage}%)`);
        }

        // Recommendations
        const recommendations = this.generateRecommendations();
        if (recommendations.length > 0) {
            console.log('\nRECOMMENDATIONS:');
            for (const rec of recommendations) {
                const icon = rec.severity === 'ERROR' ? '✗' :
                            rec.severity === 'WARNING' ? '⚠' : 'ℹ';
                console.log(`  ${icon} [${rec.severity}] ${rec.message}`);
                console.log(`    → ${rec.suggestion}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════\n');

        return this.stats.totalSize <= this.targets.totalSize;
    }

    /**
     * Save detailed report to JSON
     */
    async saveReport() {
        const reportPath = path.join(projectRoot, 'benchmarks', 'bundle-analysis.json');
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            targets: this.targets,
            recommendations: this.generateRecommendations(),
            files: this.files
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`Detailed report saved to: ${reportPath}`);
    }
}

// Run analysis
async function main() {
    const analyzer = new BundleAnalyzer();

    try {
        await analyzer.analyze();
        const passed = analyzer.printReport();
        await analyzer.saveReport();

        // Exit with error if targets not met
        process.exit(passed ? 0 : 1);
    } catch (error) {
        console.error('Analysis failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default BundleAnalyzer;
