import {describe, it, expect, beforeEach} from 'vitest';
import {ConfirmationDialogHandler} from './confirmationDialogHandler.js';
import type {ProjectContext} from '../types/index.js';

describe('ConfirmationDialogHandler', () => {
	let handler: ConfirmationDialogHandler;
	let reactContext: ProjectContext;
	let nodeContext: ProjectContext;

	beforeEach(() => {
		handler = new ConfirmationDialogHandler();

		reactContext = {
			projectType: {
				framework: 'react',
				language: 'typescript',
				buildSystem: 'npm',
				patterns: [],
			},
			recentFiles: [],
			hasTests: true,
			hasDocumentation: true,
			dependencies: ['react', 'react-dom'],
			devDependencies: ['@types/react', 'jest'],
			cacheTimestamp: new Date(),
		};

		nodeContext = {
			projectType: {
				framework: 'node',
				language: 'javascript',
				buildSystem: 'npm',
				patterns: [],
			},
			recentFiles: [],
			hasTests: false,
			hasDocumentation: false,
			dependencies: ['express'],
			devDependencies: [],
			cacheTimestamp: new Date(),
		};
	});

	describe('test execution dialogs', () => {
		it('should confirm test execution for projects with tests', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want me to run npm test?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.9);
			expect(decision.dialogType).toBe('test-execution');
			expect(decision.response).toBe('1');
		});

		it('should still confirm test execution for projects without tests', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want me to run npm test?',
				nodeContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.7);
			expect(decision.dialogType).toBe('test-execution');
		});

		it('should handle various test command formats', () => {
			const testCommands = [
				'Do you want me to run yarn test?',
				'Should I run the test script?',
				'Do you want to run tests?',
			];

			testCommands.forEach(command => {
				const decision = handler.shouldAutoConfirm(command, reactContext);
				expect(decision.shouldConfirm).toBe(true);
				expect(decision.dialogType).toBe('test-execution');
			});
		});
	});

	describe('file creation dialogs', () => {
		it('should confirm creation of service files', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to create debugInfoService.ts?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBeGreaterThan(0.8);
			expect(decision.dialogType).toBe('file-creation');
			expect(decision.response).toBe('1');
		});

		it('should confirm creation of utility files', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to create utils/helper.ts?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.dialogType).toBe('file-creation');
		});

		it('should be conservative about unknown file types', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to create mysteriousFile.xyz?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.confidence).toBeLessThan(0.7);
		});

		it('should consider file type compatibility', () => {
			const tsDecision = handler.shouldAutoConfirm(
				'Do you want to create component.tsx?',
				reactContext,
			);

			expect(tsDecision.shouldConfirm).toBe(true);
		});
	});

	describe('package installation dialogs', () => {
		it('should confirm installation of known safe packages', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to install @types/react package?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBeGreaterThan(0.7);
			expect(decision.dialogType).toBe('package-install');
		});

		it('should be conservative about unknown packages', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to install suspicious-package?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.dialogType).toBe('package-install');
		});

		it('should consider framework-specific packages', () => {
			const reactDecision = handler.shouldAutoConfirm(
				'Do you want to install react-router?',
				reactContext,
			);

			const expressDecision = handler.shouldAutoConfirm(
				'Do you want to install cors?',
				nodeContext,
			);

			expect(reactDecision.shouldConfirm).toBe(true);
			expect(expressDecision.shouldConfirm).toBe(true);
		});
	});

	describe('build script dialogs', () => {
		it('should confirm build operations', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want me to run npm run build?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.85);
			expect(decision.dialogType).toBe('build-script');
		});

		it('should confirm dev scripts', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to start the dev server?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.8);
		});

		it('should be conservative about unknown scripts', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to run the deploy script?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.confidence).toBeLessThan(0.7);
		});
	});

	describe('git operation dialogs', () => {
		it('should confirm git add operations', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to git add the files?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.9);
			expect(decision.dialogType).toBe('git-operation');
		});

		it('should confirm commits when there are changes', () => {
			const contextWithChanges = {
				...reactContext,
				gitStatus: {
					filesAdded: 2,
					filesDeleted: 1,
					aheadCount: 0,
					behindCount: 0,
					parentBranch: 'main',
				},
			};

			const decision = handler.shouldAutoConfirm(
				'Do you want to commit the changes?',
				contextWithChanges,
			);

			expect(decision.shouldConfirm).toBe(true);
			expect(decision.confidence).toBe(0.75);
		});

		it('should be conservative about push operations', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to push to remote?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.confidence).toBeLessThan(0.5);
		});
	});

	describe('unknown dialogs', () => {
		it('should not auto-confirm unknown dialog types', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to format your hard drive?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.confidence).toBe(0);
			expect(decision.dialogType).toBe('unknown');
		});

		it('should require manual confirmation for ambiguous operations', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to proceed with the operation?',
				reactContext,
			);

			expect(decision.shouldConfirm).toBe(false);
			expect(decision.dialogType).toBe('unknown');
		});
	});

	describe('confidence threshold', () => {
		it('should return appropriate confidence threshold', () => {
			const threshold = handler.getConfidenceThreshold();
			expect(threshold).toBe(0.7);
		});
	});

	describe('response formatting', () => {
		it('should provide response format for confirmations', () => {
			const decision = handler.shouldAutoConfirm(
				'Do you want to run tests?',
				reactContext,
			);

			expect(decision.response).toBe('1');
		});
	});
});
