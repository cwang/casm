import type {
	GuidanceSource,
	AnalysisContext,
	GuidanceResult,
	AutopilotConfig,
} from '../../types/index.js';
import {LLMClient} from '../llmClient.js';

/**
 * Guide Prompt Guidance Source - uses custom user guide prompt for LLM analysis
 * This guidance source applies the user's custom guide prompt to analyze Claude Code sessions
 */
export class GuidePromptGuidanceSource implements GuidanceSource {
	public readonly id = 'guide-prompt';
	public readonly priority = 100; // Lowest priority - fallback option
	public readonly canShortCircuit = false; // General analysis doesn't short-circuit

	private llmClient: LLMClient;

	constructor(config: AutopilotConfig) {
		this.llmClient = new LLMClient(config);
		const provider = this.llmClient.getCurrentProviderName();
		console.log(`🔌 GuidePromptGuidance initialized: ${provider} provider`);
	}

	async analyze(context: AnalysisContext): Promise<GuidanceResult> {
		const startTime = Date.now();
		try {
			// Use existing LLMClient logic
			const decision = await this.llmClient.analyzeClaudeOutput(
				context.terminalOutput,
				context.projectPath,
			);
			const duration = Date.now() - startTime;

			if (decision.shouldIntervene) {
				console.log(
					`⚡ GuidePromptGuidance analysis completed: ${duration.toFixed(1)}ms, providing guidance (confidence: ${decision.confidence})`,
				);
			} else {
				console.log(
					`⚡ GuidePromptGuidance analysis completed: ${duration.toFixed(1)}ms, no intervention needed (confidence: ${decision.confidence})`,
				);
			}

			// Convert AutopilotDecision to GuidanceResult
			return {
				shouldIntervene: decision.shouldIntervene,
				confidence: decision.confidence,
				guidance: decision.guidance,
				reasoning: decision.reasoning,
				source: this.id,
				priority: this.priority,
				metadata: {
					llmProvider: this.llmClient.getCurrentProviderName(),
					analysisTimestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			console.log(
				`❌ GuidePromptGuidance analysis failed: ${duration.toFixed(1)}ms, ${error instanceof Error ? error.message : String(error)}`,
			);

			// Return safe fallback result on error
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: `LLM analysis failed: ${error instanceof Error ? error.message : String(error)}`,
				source: this.id,
				priority: this.priority,
				metadata: {
					error: true,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}

	/**
	 * Update the LLM configuration
	 */
	updateConfig(config: AutopilotConfig): void {
		this.llmClient.updateConfig(config);
		const provider = this.llmClient.getCurrentProviderName();
		console.log(`🔄 GuidePromptGuidance config updated: ${provider} provider`);
	}

	/**
	 * Check if LLM is available for analysis
	 */
	isAvailable(): boolean {
		return this.llmClient.isAvailable();
	}

	/**
	 * Get current LLM provider name for debugging
	 */
	getCurrentProviderName(): string {
		return this.llmClient.getCurrentProviderName();
	}
}
