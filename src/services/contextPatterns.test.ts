import {describe, it, expect, beforeEach} from 'vitest';
import {ContextPatterns} from './contextPatterns.js';
import type {ProjectContext} from '../types/index.js';

describe('ContextPatterns', () => {
	let contextPatterns: ContextPatterns;
	let reactContext: ProjectContext;

	beforeEach(() => {
		contextPatterns = new ContextPatterns();

		reactContext = {
			projectType: {
				framework: 'react',
				language: 'typescript',
				buildSystem: 'npm',
				testFramework: 'jest',
				patterns: [],
			},
			gitStatus: {
				filesAdded: 2,
				filesDeleted: 1,
				aheadCount: 1,
				behindCount: 0,
				parentBranch: 'main',
			},
			recentFiles: [],
			hasTests: true,
			hasDocumentation: true,
			dependencies: ['react', 'react-dom'],
			devDependencies: ['@types/react', 'jest'],
			cacheTimestamp: new Date(),
		};
	});

	describe('confirmation dialog patterns', () => {
		it('should detect and handle test execution confirmations', () => {
			const output = 'Do you want me to run npm test?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(
				p => p.id === 'confirm-test-execution',
			);
			expect(confirmPattern).toBeDefined();
			expect(confirmPattern?.priority).toBe(10);
			expect(confirmPattern?.guidance).toBe('1');
			expect(confirmPattern?.category).toBe('confirmation-dialog');
		});

		it('should detect utility file creation confirmations', () => {
			const output = 'Do you want to create debugInfoService.ts?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(
				p => p.id === 'confirm-utility-file-creation',
			);
			expect(confirmPattern).toBeDefined();
			expect(confirmPattern?.priority).toBe(9);
			expect(confirmPattern?.guidance).toBe('1');
		});

		it('should detect build execution confirmations', () => {
			const output = 'Do you want me to run npm run build?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(
				p => p.id === 'confirm-build-execution',
			);
			expect(confirmPattern).toBeDefined();
			expect(confirmPattern?.guidance).toBe('1');
		});

		it('should detect safe package installation confirmations', () => {
			const output = 'Do you want to install @types/react package?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(
				p => p.id === 'confirm-safe-package-install',
			);
			expect(confirmPattern).toBeDefined();
			expect(confirmPattern?.priority).toBe(8);
		});

		it('should detect git staging confirmations', () => {
			const output = 'Do you want to git add the modified files?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(p => p.id === 'confirm-git-staging');
			expect(confirmPattern).toBeDefined();
			expect(confirmPattern?.guidance).toBe('1');
		});

		it('should not auto-confirm unsafe package installations', () => {
			const output = 'Do you want to install suspicious-malware-package?';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const confirmPattern = patterns.find(
				p => p.id === 'confirm-safe-package-install',
			);
			expect(confirmPattern).toBeUndefined();
		});
	});

	describe('framework-specific patterns', () => {
		it('should detect React hook dependency issues', () => {
			const output = 'React Hook useEffect has missing dependencies: [count]';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const reactPattern = patterns.find(p => p.id === 'react-hook-deps');
			expect(reactPattern).toBeDefined();
			expect(reactPattern?.priority).toBe(9);
			expect(reactPattern?.category).toBe('react-hooks');
		});

		it('should detect TypeScript type errors', () => {
			const typeScriptContext = {
				...reactContext,
				projectType: {
					...reactContext.projectType,
					framework: 'typescript' as const,
				},
			};

			const output = 'Type error: Property does not exist';
			const patterns = contextPatterns.getGuidancePatterns(
				typeScriptContext,
				output,
			);

			const tsPattern = patterns.find(p => p.id === 'typescript-type-error');
			expect(tsPattern).toBeDefined();
			expect(tsPattern?.priority).toBe(9);
		});
	});

	describe('git workflow patterns', () => {
		it('should suggest committing uncommitted changes', () => {
			const output = 'You need to commit your changes before proceeding';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const gitPattern = patterns.find(p => p.id === 'git-uncommitted-changes');
			expect(gitPattern).toBeDefined();
			expect(gitPattern?.guidance).toContain('3 uncommitted changes');
		});

		it('should suggest pushing unpushed commits', () => {
			const output = 'You should push your commits to remote';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const gitPattern = patterns.find(p => p.id === 'git-unpushed-commits');
			expect(gitPattern).toBeDefined();
			expect(gitPattern?.guidance).toContain('1 unpushed commits');
		});
	});

	describe('testing patterns', () => {
		it('should provide test-specific guidance for projects with tests', () => {
			const output = 'Test failed: expected true but got false';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const testPattern = patterns.find(p => p.id === 'test-failure');
			expect(testPattern).toBeDefined();
			expect(testPattern?.category).toBe('testing');
		});

		it('should provide Jest-specific guidance', () => {
			const output = 'Jest encountered an error';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const jestPattern = patterns.find(p => p.id === 'jest-test-guidance');
			expect(jestPattern).toBeDefined();
		});
	});

	describe('dependency patterns', () => {
		it('should detect package installation needs', () => {
			const output = 'npm install react-router-dom';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const depPattern = patterns.find(p => p.id === 'dependency-installation');
			expect(depPattern).toBeDefined();
			expect(depPattern?.category).toBe('dependencies');
		});

		it('should detect security vulnerabilities', () => {
			const output = 'Found 5 vulnerabilities in npm audit';
			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			const secPattern = patterns.find(p => p.id === 'security-vulnerability');
			expect(secPattern).toBeDefined();
			expect(secPattern?.priority).toBe(9);
			expect(secPattern?.category).toBe('security');
		});
	});

	describe('context summary', () => {
		it('should generate comprehensive context summary', () => {
			const summary = contextPatterns.getContextSummary(reactContext);

			expect(summary).toContain('react/typescript');
			expect(summary).toContain('with tests');
			expect(summary).toContain('git-managed');
			expect(summary).toContain('3 changed files');
			expect(summary).toContain('1 ahead');
			expect(summary).toContain('react, react-dom');
		});

		it('should handle projects without git status', () => {
			const noGitContext = {
				...reactContext,
				gitStatus: undefined,
			};

			const summary = contextPatterns.getContextSummary(noGitContext);

			expect(summary).toContain('non-git');
			expect(summary).not.toContain('changed files');
		});
	});

	describe('pattern priority sorting', () => {
		it('should sort patterns by priority (highest first)', () => {
			const output = `
				Do you want to run npm test?
				React Hook useEffect has missing dependencies
				Type error occurred
			`;

			const patterns = contextPatterns.getGuidancePatterns(
				reactContext,
				output,
			);

			// Confirmation dialogs should have highest priority (10)
			// React patterns should be next (9)
			// Other patterns follow
			expect(patterns[0]?.priority).toBeGreaterThanOrEqual(9);

			// Check that patterns are sorted correctly
			for (let i = 1; i < patterns.length; i++) {
				const prevPriority = patterns[i - 1]?.priority ?? 0;
				const currentPriority = patterns[i]?.priority ?? 0;
				expect(prevPriority).toBeGreaterThanOrEqual(currentPriority);
			}
		});
	});
});
