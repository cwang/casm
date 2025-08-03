import type {ProjectContext, ProjectType} from '../types/index.js';

/**
 * Intelligent handler for Claude Code confirmation dialogs
 * Analyzes project context to provide smart automatic responses
 */
export class ConfirmationDialogHandler {
	/**
	 * Analyze confirmation dialog and provide intelligent response
	 */
	shouldAutoConfirm(
		dialogText: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		const decision = this.analyzeConfirmationDialog(dialogText, projectContext);

		console.log(
			`🤖 Confirmation dialog analysis: "${dialogText}" → ${decision.shouldConfirm ? 'YES' : 'NO'} (confidence: ${decision.confidence})`,
		);

		return decision;
	}

	/**
	 * Analyze the confirmation dialog and project context to make decision
	 */
	private analyzeConfirmationDialog(
		dialogText: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		const normalizedText = dialogText.toLowerCase().trim();

		// Test running confirmations
		if (this.isTestRunningDialog(normalizedText)) {
			return this.handleTestRunningDialog(normalizedText, projectContext);
		}

		// File creation confirmations
		if (this.isFileCreationDialog(normalizedText)) {
			return this.handleFileCreationDialog(normalizedText, projectContext);
		}

		// Package installation confirmations
		if (this.isPackageInstallDialog(normalizedText)) {
			return this.handlePackageInstallDialog(normalizedText, projectContext);
		}

		// Build/script running confirmations
		if (this.isBuildScriptDialog(normalizedText)) {
			return this.handleBuildScriptDialog(normalizedText, projectContext);
		}

		// Git operation confirmations
		if (this.isGitOperationDialog(normalizedText)) {
			return this.handleGitOperationDialog(normalizedText, projectContext);
		}

		// Default: don't auto-confirm unknown dialogs
		return {
			shouldConfirm: false,
			confidence: 0,
			reasoning:
				'Unknown dialog type - manual confirmation required for safety',
			dialogType: 'unknown',
		};
	}

	/**
	 * Test running dialog detection and handling
	 */
	private isTestRunningDialog(text: string): boolean {
		return /run.*test|npm test|yarn test|test.*script/.test(text);
	}

	private handleTestRunningDialog(
		text: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		// Always confirm test running - it's safe and beneficial
		if (projectContext.hasTests) {
			return {
				shouldConfirm: true,
				confidence: 0.9,
				reasoning:
					'Project has tests - running tests is always recommended for verification',
				dialogType: 'test-execution',
				response: '1', // Usually "Yes" is option 1
			};
		}

		// Even without detected tests, still likely safe to run
		return {
			shouldConfirm: true,
			confidence: 0.7,
			reasoning:
				'Test execution is generally safe and provides valuable feedback',
			dialogType: 'test-execution',
			response: '1',
		};
	}

	/**
	 * File creation dialog detection and handling
	 */
	private isFileCreationDialog(text: string): boolean {
		return /create.*file|create.*\.(ts|js|tsx|jsx|py|go|rs)|want.*create/.test(
			text,
		);
	}

	private handleFileCreationDialog(
		text: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		// Extract file type from dialog
		const fileTypeMatch = text.match(/\.(\w+)/);
		const fileType = fileTypeMatch ? fileTypeMatch[1] : null;

		// Check if file type matches project type
		if (
			fileType &&
			this.isFileTypeCompatible(fileType, projectContext.projectType)
		) {
			// Check if it's a common/useful file pattern
			if (this.isCommonFilePattern(text)) {
				return {
					shouldConfirm: true,
					confidence: 0.85,
					reasoning: `Creating ${fileType} file aligns with ${projectContext.projectType.framework}/${projectContext.projectType.language} project`,
					dialogType: 'file-creation',
					response: '1',
				};
			}
		}

		// For service/utility files, generally confirm
		if (/service|util|helper|config|debug/.test(text)) {
			return {
				shouldConfirm: true,
				confidence: 0.8,
				reasoning:
					'Service/utility files are generally beneficial for project organization',
				dialogType: 'file-creation',
				response: '1',
			};
		}

		// Conservative approach for unknown file types
		return {
			shouldConfirm: false,
			confidence: 0.6,
			reasoning:
				'File creation requires manual review to ensure it fits project structure',
			dialogType: 'file-creation',
		};
	}

	/**
	 * Package installation dialog detection and handling
	 */
	private isPackageInstallDialog(text: string): boolean {
		return /install.*package|npm install|yarn add|add.*dependency|install\s+[a-zA-Z0-9-_@/]+/.test(
			text,
		);
	}

	private handlePackageInstallDialog(
		text: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		// Extract package name if possible
		const packageMatch = text.match(/install.*?([a-zA-Z0-9-_@/]+)/);
		const packageName = packageMatch ? packageMatch[1] : null;

		// Check for known safe packages
		if (
			packageName &&
			this.isKnownSafePackage(packageName, projectContext.projectType)
		) {
			return {
				shouldConfirm: true,
				confidence: 0.8,
				reasoning: `Package "${packageName}" is commonly used in ${projectContext.projectType.framework} projects`,
				dialogType: 'package-install',
				response: '1',
			};
		}

		// Conservative approach for unknown packages
		return {
			shouldConfirm: false,
			confidence: 0.5,
			reasoning:
				'Package installation requires manual review for security and compatibility',
			dialogType: 'package-install',
		};
	}

	/**
	 * Build/script dialog detection and handling
	 */
	private isBuildScriptDialog(text: string): boolean {
		return /run.*build|npm run|yarn run|build.*script|start.*script|start.*dev|start.*server/.test(
			text,
		);
	}

	private handleBuildScriptDialog(
		text: string,
		_projectContext: ProjectContext,
	): ConfirmationDecision {
		// Build scripts are generally safe
		if (/build|compile|bundle/.test(text)) {
			return {
				shouldConfirm: true,
				confidence: 0.85,
				reasoning: 'Build operations are safe and help verify code correctness',
				dialogType: 'build-script',
				response: '1',
			};
		}

		// Dev scripts are usually safe
		if (/dev|watch|start.*dev/.test(text)) {
			return {
				shouldConfirm: true,
				confidence: 0.8,
				reasoning:
					'Development scripts are typically safe for local development',
				dialogType: 'build-script',
				response: '1',
			};
		}

		// Conservative for other scripts
		return {
			shouldConfirm: false,
			confidence: 0.6,
			reasoning: 'Custom scripts require manual review for safety',
			dialogType: 'build-script',
		};
	}

	/**
	 * Git operation dialog detection and handling
	 */
	private isGitOperationDialog(text: string): boolean {
		return /git.*commit|git.*add|git.*push|commit.*changes/.test(text);
	}

	private handleGitOperationDialog(
		text: string,
		projectContext: ProjectContext,
	): ConfirmationDecision {
		// Staging files is generally safe
		if (/git.*add|stage.*file/.test(text)) {
			return {
				shouldConfirm: true,
				confidence: 0.9,
				reasoning:
					'Staging files is a safe operation that can be easily undone',
				dialogType: 'git-operation',
				response: '1',
			};
		}

		// Committing is more cautious
		if (/commit/.test(text)) {
			const hasChanges =
				projectContext.gitStatus &&
				(projectContext.gitStatus.filesAdded > 0 ||
					projectContext.gitStatus.filesDeleted > 0);

			if (hasChanges) {
				return {
					shouldConfirm: true,
					confidence: 0.75,
					reasoning: 'Committing staged changes helps preserve progress',
					dialogType: 'git-operation',
					response: '1',
				};
			}
		}

		// Conservative for push operations
		if (/push/.test(text)) {
			return {
				shouldConfirm: false,
				confidence: 0.4,
				reasoning:
					'Push operations should be manually reviewed before execution',
				dialogType: 'git-operation',
			};
		}

		return {
			shouldConfirm: false,
			confidence: 0.5,
			reasoning: 'Git operations require careful manual review',
			dialogType: 'git-operation',
		};
	}

	/**
	 * Helper methods
	 */
	private isFileTypeCompatible(
		fileType: string | null,
		projectType: ProjectType,
	): boolean {
		if (!fileType) return false;

		const compatibilityMap: Record<string, string[]> = {
			typescript: ['ts', 'tsx', 'js', 'jsx'],
			javascript: ['js', 'jsx', 'ts', 'tsx'],
			react: ['tsx', 'jsx', 'ts', 'js'],
			next: ['tsx', 'jsx', 'ts', 'js'],
			vue: ['vue', 'ts', 'js'],
			python: ['py', 'pyi'],
			go: ['go'],
			rust: ['rs'],
		};

		const compatibleTypes = [
			...(compatibilityMap[projectType.framework] || []),
			...(compatibilityMap[projectType.language] || []),
		];

		return compatibleTypes.includes(fileType.toLowerCase());
	}

	private isCommonFilePattern(text: string): boolean {
		const commonPatterns = [
			/service/i,
			/util/i,
			/helper/i,
			/config/i,
			/constant/i,
			/type/i,
			/interface/i,
			/component/i,
			/hook/i,
			/debug/i,
			/logger/i,
		];

		return commonPatterns.some(pattern => pattern.test(text));
	}

	private isKnownSafePackage(
		packageName: string,
		projectType: ProjectType,
	): boolean {
		const safePackages: Record<string, string[]> = {
			react: [
				'react-router',
				'react-dom',
				'styled-components',
				'axios',
				'lodash',
			],
			typescript: ['@types/', 'ts-node', 'typescript', 'eslint', 'prettier'],
			next: ['next', 'react', 'react-dom', '@next/', 'styled-components'],
			express: ['express', 'cors', 'helmet', 'morgan', 'body-parser'],
			node: ['axios', 'lodash', 'moment', 'uuid', 'dotenv', 'cors', 'express'],
		};

		const knownSafe = [
			...(safePackages[projectType.framework] || []),
			...(safePackages[projectType.language] || []),
			'eslint',
			'prettier',
			'jest',
			'vitest',
		];

		return knownSafe.some(safe => packageName.includes(safe));
	}

	/**
	 * Get confirmation decision confidence threshold
	 */
	getConfidenceThreshold(): number {
		return 0.7; // Only auto-confirm when confidence >= 70%
	}
}

/**
 * Confirmation decision interface
 */
export interface ConfirmationDecision {
	shouldConfirm: boolean;
	confidence: number; // 0.0 to 1.0
	reasoning: string;
	dialogType: string;
	response?: string; // The response to send (e.g., "1" for Yes, "2" for No)
}
