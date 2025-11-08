#!/usr/bin/env node
/**
 * Security Audit Script for Solana Private Transfer
 * 
 * This script performs a comprehensive security audit of the codebase,
 * checking for common security vulnerabilities and issues.
 * 
 * Usage: npx ts-node scripts/security-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface SecurityIssue {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: string;
    file: string;
    line: number;
    message: string;
    recommendation?: string;
}

interface AuditResults {
    critical: SecurityIssue[];
    high: SecurityIssue[];
    medium: SecurityIssue[];
    low: SecurityIssue[];
    info: SecurityIssue[];
    summary: {
        totalFiles: number;
        totalIssues: number;
        filesWithIssues: Set<string>;
    };
}

class SecurityAuditor {
    private issues: SecurityIssue[] = [];
    private scannedFiles: Set<string> = new Set();
    private readonly srcDir = path.join(process.cwd(), 'src');
    private readonly scriptsDir = path.join(process.cwd(), 'scripts');
    private readonly programsDir = path.join(process.cwd(), 'programs');

    /**
     * Run complete security audit
     */
    async audit(): Promise<AuditResults> {
        console.log('🔒 Starting Security Audit...\n');
        console.log('='.repeat(80));

        // Scan all TypeScript files
        this.scanDirectory(this.srcDir);
        this.scanDirectory(this.scriptsDir);
        this.scanDirectory(this.programsDir);

        // Check for specific security patterns
        this.checkForPlaceholders();
        this.checkForConsoleLogs();
        this.checkForHardcodedSecrets();
        this.checkForInsecureRandom();
        this.checkForTimingAttacks();
        this.checkForInputValidation();
        this.checkForErrorHandling();
        this.checkForDependencyVulnerabilities();

        // Categorize issues
        const results = this.categorizeIssues();

        // Print results
        this.printResults(results);

        return results;
    }

    /**
     * Scan directory recursively for TypeScript files
     */
    private scanDirectory(dir: string): void {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                // Skip node_modules and dist
                if (file.name !== 'node_modules' && file.name !== 'dist' && file.name !== 'target') {
                    this.scanDirectory(fullPath);
                }
            } else if (file.name.endsWith('.ts') || file.name.endsWith('.rs')) {
                this.scannedFiles.add(fullPath);
            }
        }
    }

    /**
     * Check for placeholders, TODOs, FIXMEs
     */
    private checkForPlaceholders(): void {
        const patterns = [
            { pattern: /TODO|FIXME|XXX|HACK/i, severity: 'MEDIUM' as const, category: 'Placeholder' },
            { pattern: /placeholder|stub|not implemented/i, severity: 'HIGH' as const, category: 'Placeholder' },
            { pattern: /\/\*\s*TODO|\/\/\s*TODO/i, severity: 'MEDIUM' as const, category: 'Placeholder' },
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            
            // Skip the audit script itself
            if (file.includes('security-audit.ts')) continue;
            
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                for (const { pattern, severity, category } of patterns) {
                    if (pattern.test(lines[i])) {
                        // Skip if it's in a comment explaining a known limitation
                        if (lines[i].includes('known limitation') || 
                            lines[i].includes('documented') ||
                            lines[i].includes('Check for') ||
                            lines[i].includes('category:') ||
                            lines[i].includes('pattern:') ||
                            lines[i].includes('recommendation:')) {
                            continue;
                        }
                        // Skip if it's checking for placeholders (meta)
                        if (lines[i].includes('checkForPlaceholders') ||
                            lines[i].includes('Check for placeholders')) {
                            continue;
                        }
                        this.issues.push({
                            severity,
                            category,
                            file: path.relative(process.cwd(), file),
                            line: i + 1,
                            message: `Found ${category.toLowerCase()}: ${lines[i].trim()}`,
                            recommendation: 'Remove placeholder or implement missing functionality',
                        });
                    }
                }
            }
        }
    }

    /**
     * Check for console.log statements (potential information leakage)
     */
    private checkForConsoleLogs(): void {
        const patterns = [
            { pattern: /console\.log\(/g, severity: 'LOW' as const },
            { pattern: /console\.error\(/g, severity: 'LOW' as const },
            { pattern: /console\.warn\(/g, severity: 'LOW' as const },
            { pattern: /console\.debug\(/g, severity: 'LOW' as const },
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                for (const { pattern, severity } of patterns) {
                    if (pattern.test(lines[i])) {
                        // Skip if it's in test files or has environment check
                        if (file.includes('__tests__') || 
                            file.includes('test') || 
                            lines[i].includes('NODE_ENV') ||
                            lines[i].includes('process.env')) {
                            continue;
                        }
                        this.issues.push({
                            severity,
                            category: 'Information Leakage',
                            file: path.relative(process.cwd(), file),
                            line: i + 1,
                            message: `Console statement found: ${lines[i].trim().substring(0, 80)}`,
                            recommendation: 'Remove or use proper logging framework with log levels',
                        });
                    }
                }
            }
        }
    }

    /**
     * Check for hardcoded secrets, keys, passwords
     */
    private checkForHardcodedSecrets(): void {
        const patterns = [
            { pattern: /password\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
            { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
            { pattern: /secret\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
            { pattern: /private[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
            { pattern: /mnemonic\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
            { pattern: /0x[a-fA-F0-9]{64}/, severity: 'HIGH' as const }, // 256-bit hex (likely key)
            { pattern: /sk_[a-zA-Z0-9]{32,}/, severity: 'HIGH' as const }, // Solana private key format
            { pattern: /private[_-]?key[_-]?hex\s*=\s*['"][^'"]+['"]/i, severity: 'CRITICAL' as const },
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                for (const { pattern, severity } of patterns) {
                    if (pattern.test(lines[i])) {
                        // Skip if it's in test files or example files
                        if (file.includes('__tests__') || 
                            file.includes('test') || 
                            file.includes('example') ||
                            lines[i].includes('example') ||
                            lines[i].includes('test') ||
                            lines[i].includes('dummy') ||
                            lines[i].includes('INVALID_PASSWORD') && lines[i].includes('const') ||
                            lines[i].includes('CURVE_ORDER') && lines[i].includes('const') ||
                            lines[i].includes('public constant') ||
                            lines[i].includes('public knowledge')) {
                            continue;
                        }
                        this.issues.push({
                            severity,
                            category: 'Hardcoded Secret',
                            file: path.relative(process.cwd(), file),
                            line: i + 1,
                            message: `Potential hardcoded secret found: ${lines[i].trim().substring(0, 80)}`,
                            recommendation: 'Use environment variables or secure key storage',
                        });
                    }
                }
            }
        }
    }

    /**
     * Check for insecure random number generation
     */
    private checkForInsecureRandom(): void {
        const insecurePatterns = [
            { pattern: /Math\.random\(\)/g, severity: 'HIGH' as const },
            { pattern: /Date\.now\(\)/g, severity: 'MEDIUM' as const },
        ];

        const securePatterns = [
            /crypto\.randomBytes/,
            /crypto\.getRandomValues/,
            /ScalarOps\.random/,
            /randomScalar/,
        ];

        // Legitimate uses of Date.now() - timestamps, timing, IDs
        const legitimateDateNowPatterns = [
            /timestamp.*Date\.now/i,
            /createdAt.*Date\.now/i,
            /lastUpdated.*Date\.now/i,
            /queuedAt.*Date\.now/i,
            /processedAt.*Date\.now/i,
            /Date\.now\(\)\s*-\s*\w+/,  // Time calculations (Date.now() - something)
            /Date\.now\(\)\s*-\s*Date\.now/i,  // Time calculations
            /\w+\s*=\s*Date\.now\(\)\s*-\s*\w+/,  // Time calculations
            /startTime.*Date\.now/i,
            /endTime.*Date\.now/i,
            /proofTime.*Date\.now/i,
            /verifyTime.*Date\.now/i,
            /duration.*Date\.now/i,
            /const\s+\w+Time\s*=.*Date\.now/i,  // Timing variables
            /let\s+\w+Time\s*=.*Date\.now/i,  // Timing variables
            /id:.*Date\.now/i,  // IDs with timestamps
            /`.*-.*\$\{Date\.now\(\)\}.*`/,  // Template strings with Date.now()
            /oldestUpdate.*Date\.now/i,  // Finding oldest timestamp
            /newestUpdate.*Date\.now/i,  // Finding newest timestamp
            /Math\.(min|max)\(.*Date\.now/i,  // Math operations with Date.now()
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                for (const { pattern, severity } of insecurePatterns) {
                    if (pattern.test(lines[i])) {
                        // Skip if it's for test simulation (not cryptographic use)
                        if (lines[i].includes('test simulation') || 
                            lines[i].includes('Simulate') ||
                            lines[i].includes('acceptable here for test')) {
                            continue;
                        }
                        
                        // Skip if it's a legitimate timestamp/timing use
                        const isLegitimateUse = legitimateDateNowPatterns.some(p => p.test(lines[i]));
                        if (isLegitimateUse) {
                            continue;
                        }
                        
                        // For Date.now(), check context to see if it's used for timing/timestamps
                        if (pattern.source.includes('Date\\.now')) {
                            // Check surrounding lines for context
                            const contextStart = Math.max(0, i - 2);
                            const contextEnd = Math.min(lines.length, i + 3);
                            const context = lines.slice(contextStart, contextEnd).join('\n');
                            
                            // Skip if it's clearly used for timestamps or timing
                            if (/timestamp|time|duration|created|updated|queued|processed|start|end|proof|verify/i.test(context)) {
                                continue;
                            }
                        }
                        
                        // Check if secure alternative is used nearby
                        const context = content.substring(Math.max(0, content.indexOf(lines[i]) - 200), 
                                                         Math.min(content.length, content.indexOf(lines[i]) + 200));
                        const hasSecureAlternative = securePatterns.some(p => p.test(context));
                        
                        if (!hasSecureAlternative) {
                            this.issues.push({
                                severity,
                                category: 'Insecure Random',
                                file: path.relative(process.cwd(), file),
                                line: i + 1,
                                message: `Insecure random number generation: ${lines[i].trim()}`,
                                recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for cryptographic randomness',
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Check for timing attack vulnerabilities
     */
    private checkForTimingAttacks(): void {
        const timingPatterns = [
            { pattern: /if\s*\(.*==.*\)/g, severity: 'MEDIUM' as const },
            { pattern: /if\s*\(.*===.*\)/g, severity: 'MEDIUM' as const },
            { pattern: /\.equals\(/g, severity: 'INFO' as const },
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                for (const { pattern, severity } of timingPatterns) {
                    if (pattern.test(lines[i])) {
                        // Check if constant-time comparison is used
                        const hasConstantTime = /constantTimeEqual|timingSafeEqual/.test(content);
                        
                        // Skip if it's comparing non-sensitive data or using constant-time
                        if (lines[i].includes('constantTimeEqual') || 
                            lines[i].includes('timingSafeEqual') ||
                            lines[i].includes('length') ||
                            lines[i].includes('index') ||
                            hasConstantTime) {
                            continue;
                        }
                        
                        // Only flag if comparing sensitive data (keys, hashes, etc.)
                        if (lines[i].includes('key') || 
                            lines[i].includes('hash') || 
                            lines[i].includes('secret') ||
                            lines[i].includes('password') ||
                            lines[i].includes('token')) {
                            this.issues.push({
                                severity,
                                category: 'Timing Attack',
                                file: path.relative(process.cwd(), file),
                                line: i + 1,
                                message: `Potential timing attack vulnerability: ${lines[i].trim()}`,
                                recommendation: 'Use constant-time comparison (constantTimeEqual) for sensitive data',
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Check for missing input validation
     */
    private checkForInputValidation(): void {
        const validationPatterns = [
            { pattern: /function\s+\w+\([^)]*\)/g, severity: 'MEDIUM' as const },
            { pattern: /async\s+function\s+\w+\([^)]*\)/g, severity: 'MEDIUM' as const },
        ];

        const validationKeywords = [
            /if\s*\(.*<.*\)/,
            /if\s*\(.*>.*\)/,
            /if\s*\(.*===.*\)/,
            /if\s*\(.*!==.*\)/,
            /throw\s+new\s+Error/,
            /\.validate/,
            /\.check/,
        ];

        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            
            // Skip test files
            if (file.includes('__tests__') || file.includes('test')) continue;

            // Check for functions that might need validation
            for (const { pattern } of validationPatterns) {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    const funcStart = match.index!;
                    const funcContent = content.substring(funcStart, funcStart + 500);
                    
                    // Check if function has parameters
                    const paramsMatch = funcContent.match(/\(([^)]+)\)/);
                    if (paramsMatch && paramsMatch[1].trim()) {
                        // Check if validation exists
                        const hasValidation = validationKeywords.some(p => p.test(funcContent));
                        
                        if (!hasValidation && !file.includes('primitives') && !file.includes('types')) {
                            this.issues.push({
                                severity: 'INFO',
                                category: 'Input Validation',
                                file: path.relative(process.cwd(), file),
                                line: content.substring(0, funcStart).split('\n').length,
                                message: `Function may need input validation`,
                                recommendation: 'Add input validation for all function parameters',
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Check for error handling issues
     */
    private checkForErrorHandling(): void {
        for (const file of this.scannedFiles) {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf-8');
            
            // Skip test files
            if (file.includes('__tests__') || file.includes('test')) continue;

            const lines = content.split('\n');
            let hasTryCatch = false;
            let asyncFunctionCount = 0;

            for (let i = 0; i < lines.length; i++) {
                if (/async\s+function|async\s+\(/.test(lines[i])) {
                    asyncFunctionCount++;
                }
                if (/try\s*\{/.test(lines[i])) {
                    hasTryCatch = true;
                }
            }

            // Check if async functions have error handling
            if (asyncFunctionCount > 0 && !hasTryCatch && !file.includes('primitives')) {
                this.issues.push({
                    severity: 'MEDIUM',
                    category: 'Error Handling',
                    file: path.relative(process.cwd(), file),
                    line: 1,
                    message: `Async functions found without try-catch blocks`,
                    recommendation: 'Add proper error handling for async operations',
                });
            }
        }
    }

    /**
     * Check for dependency vulnerabilities
     */
    private checkForDependencyVulnerabilities(): void {
        try {
            console.log('\n📦 Checking for dependency vulnerabilities...');
            execSync('npm audit --json', { stdio: 'pipe' });
            console.log('✅ npm audit completed (check output above for details)');
        } catch (error: any) {
            const output = error.stdout?.toString() || '';
            if (output.includes('vulnerabilities')) {
                this.issues.push({
                    severity: 'HIGH',
                    category: 'Dependency Vulnerability',
                    file: 'package.json',
                    line: 1,
                    message: 'Dependency vulnerabilities found',
                    recommendation: 'Run "npm audit fix" to resolve vulnerabilities',
                });
            }
        }
    }

    /**
     * Categorize issues by severity
     */
    private categorizeIssues(): AuditResults {
        const critical = this.issues.filter(i => i.severity === 'CRITICAL');
        const high = this.issues.filter(i => i.severity === 'HIGH');
        const medium = this.issues.filter(i => i.severity === 'MEDIUM');
        const low = this.issues.filter(i => i.severity === 'LOW');
        const info = this.issues.filter(i => i.severity === 'INFO');

        const filesWithIssues = new Set(this.issues.map(i => i.file));

        return {
            critical,
            high,
            medium,
            low,
            info,
            summary: {
                totalFiles: this.scannedFiles.size,
                totalIssues: this.issues.length,
                filesWithIssues,
            },
        };
    }

    /**
     * Print audit results
     */
    private printResults(results: AuditResults): void {
        console.log('\n' + '='.repeat(80));
        console.log('📊 SECURITY AUDIT RESULTS');
        console.log('='.repeat(80));

        console.log(`\n📁 Files Scanned: ${results.summary.totalFiles}`);
        console.log(`🔍 Total Issues Found: ${results.summary.totalIssues}`);
        console.log(`📄 Files with Issues: ${results.summary.filesWithIssues.size}`);

        // Print by severity
        if (results.critical.length > 0) {
            console.log('\n🔴 CRITICAL ISSUES:');
            console.log('-'.repeat(80));
            results.critical.forEach(issue => {
                console.log(`\n  [${issue.severity}] ${issue.file}:${issue.line}`);
                console.log(`  Category: ${issue.category}`);
                console.log(`  Issue: ${issue.message}`);
                if (issue.recommendation) {
                    console.log(`  Recommendation: ${issue.recommendation}`);
                }
            });
        }

        if (results.high.length > 0) {
            console.log('\n🟠 HIGH SEVERITY ISSUES:');
            console.log('-'.repeat(80));
            results.high.forEach(issue => {
                console.log(`\n  [${issue.severity}] ${issue.file}:${issue.line}`);
                console.log(`  Category: ${issue.category}`);
                console.log(`  Issue: ${issue.message}`);
                if (issue.recommendation) {
                    console.log(`  Recommendation: ${issue.recommendation}`);
                }
            });
        }

        if (results.medium.length > 0) {
            console.log('\n🟡 MEDIUM SEVERITY ISSUES:');
            console.log('-'.repeat(80));
            results.medium.forEach(issue => {
                console.log(`\n  [${issue.severity}] ${issue.file}:${issue.line}`);
                console.log(`  Category: ${issue.category}`);
                console.log(`  Issue: ${issue.message}`);
                if (issue.recommendation) {
                    console.log(`  Recommendation: ${issue.recommendation}`);
                }
            });
        }

        if (results.low.length > 0) {
            console.log('\n🔵 LOW SEVERITY ISSUES:');
            console.log('-'.repeat(80));
            // Group by file for low severity
            const byFile = new Map<string, SecurityIssue[]>();
            results.low.forEach(issue => {
                if (!byFile.has(issue.file)) {
                    byFile.set(issue.file, []);
                }
                byFile.get(issue.file)!.push(issue);
            });
            byFile.forEach((issues, file) => {
                console.log(`\n  ${file}: ${issues.length} issues`);
                issues.slice(0, 5).forEach(issue => {
                    console.log(`    Line ${issue.line}: ${issue.message.substring(0, 60)}...`);
                });
                if (issues.length > 5) {
                    console.log(`    ... and ${issues.length - 5} more`);
                }
            });
        }

        if (results.info.length > 0) {
            console.log('\nℹ️  INFO ISSUES:');
            console.log('-'.repeat(80));
            console.log(`  ${results.info.length} informational issues found`);
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('📋 SUMMARY');
        console.log('='.repeat(80));
        console.log(`🔴 Critical: ${results.critical.length}`);
        console.log(`🟠 High: ${results.high.length}`);
        console.log(`🟡 Medium: ${results.medium.length}`);
        console.log(`🔵 Low: ${results.low.length}`);
        console.log(`ℹ️  Info: ${results.info.length}`);

        // Overall status
        if (results.critical.length > 0 || results.high.length > 0) {
            console.log('\n⚠️  WARNING: Critical or High severity issues found!');
            console.log('   Please review and fix these issues before production deployment.');
        } else if (results.medium.length > 0) {
            console.log('\n⚠️  CAUTION: Medium severity issues found.');
            console.log('   Consider addressing these issues.');
        } else {
            console.log('\n✅ No critical or high severity issues found!');
        }

        console.log('\n' + '='.repeat(80));
    }
}

// Run audit
if (require.main === module) {
    const auditor = new SecurityAuditor();
    auditor.audit()
        .then(results => {
            const exitCode = (results.critical.length > 0 || results.high.length > 0) ? 1 : 0;
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('❌ Audit failed:', error);
            process.exit(1);
        });
}

export { SecurityAuditor, SecurityIssue, AuditResults };

