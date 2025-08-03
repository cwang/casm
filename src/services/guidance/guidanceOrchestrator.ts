import type {
	GuidanceSource,
	AnalysisContext,
	GuidanceResult,
	AutopilotConfig,
} from '../../types/index.js';
import {GuidePromptGuidanceSource} from './guidePromptGuidanceSource.js';
import {PatternGuidanceSource} from './patternGuidanceSource.js';
import {ContextGuidanceSource} from './contextGuidanceSource.js';

/**
 * Orchestrates multiple guidance sources to provide intelligent, layered analysis
 * Runs sources in priority order and composes final guidance
 */
export class GuidanceOrchestrator {
	private sources: Map<string, GuidanceSource> = new Map();
	private config: AutopilotConfig;

	constructor(config: AutopilotConfig) {
		this.config = config;

		// Initialize with pattern source (highest priority - runs first)
		this.addSource(new PatternGuidanceSource(config));

		// Initialize with context-aware source (medium priority - runs second)
		this.addSource(new ContextGuidanceSource(config));

		// Initialize with guide prompt source (lowest priority - runs last)
		this.addSource(new GuidePromptGuidanceSource(config));
	}

	/**
	 * Add a guidance source to the orchestrator
	 */
	addSource(source: GuidanceSource): void {
		if (this.sources.has(source.id)) {
			throw new Error(`Guidance source with ID '${source.id}' already exists`);
		}

		console.log(
			`🔌 Adding guidance source: ${source.id} (priority: ${source.priority})`,
		);
		this.sources.set(source.id, source);
	}

	/**
	 * Remove a guidance source
	 */
	removeSource(sourceId: string): boolean {
		const removed = this.sources.delete(sourceId);
		if (removed) {
			console.log(`🔌 Orchestrator removed source: ${sourceId}`);
		}
		return removed;
	}

	/**
	 * Get all registered source IDs
	 */
	getSourceIds(): string[] {
		return Array.from(this.sources.keys());
	}

	/**
	 * Generate guidance by running all sources and composing the result
	 */
	async generateGuidance(context: AnalysisContext): Promise<GuidanceResult> {
		const availableSources = Array.from(this.sources.values());

		if (availableSources.length === 0) {
			console.log('⚠️ Orchestrator: no guidance sources available');
			return this.createNoGuidanceResult('No guidance sources available');
		}

		// Sort sources by priority (lower number = higher priority)
		const sortedSources = availableSources.sort(
			(a, b) => a.priority - b.priority,
		);

		console.log(
			`🎯 Orchestrator analyzing: ${sortedSources.length} sources in priority order`,
		);

		const results: GuidanceResult[] = [];

		// Run sources in priority order
		for (const source of sortedSources) {
			try {
				console.log(
					`🔍 Orchestrator analyzing source: ${source.id} (priority: ${source.priority})`,
				);
				const startTime = Date.now();

				const result = await source.analyze(context);
				const duration = Date.now() - startTime;

				console.log(
					`✅ Orchestrator source completed: ${source.id} in ${duration.toFixed(1)}ms, shouldIntervene=${result.shouldIntervene}, confidence=${result.confidence}`,
				);

				results.push(result);

				// Short-circuit if high-confidence result and source allows it
				if (
					result.shouldIntervene &&
					result.confidence >= 0.9 &&
					source.canShortCircuit
				) {
					console.log(
						`⚡ Orchestrator short-circuiting: ${source.id} (high confidence: ${result.confidence})`,
					);
					return this.composeResponse(results, result);
				}
			} catch (error) {
				console.log(`❌ Orchestrator source error: ${source.id}:`, error);

				// Add error result but continue with other sources
				results.push({
					shouldIntervene: false,
					confidence: 0,
					reasoning: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
					source: source.id,
					priority: source.priority,
					metadata: {error: true},
				});
			}
		}

		// Compose final response from all results
		return this.composeFinalResponse(results);
	}

	/**
	 * Compose the final response from all guidance results
	 */
	private composeFinalResponse(results: GuidanceResult[]): GuidanceResult {
		console.log(
			`🎭 Orchestrator composing response: ${results.length} results`,
		);

		// Filter out error results for composition
		const validResults = results.filter(r => !r.metadata?.['error']);

		if (validResults.length === 0) {
			console.log('⚠️ Orchestrator: no valid guidance results available');
			return this.createNoGuidanceResult('All guidance sources failed');
		}

		// Find the highest priority result that wants to intervene
		const interventionResults = validResults.filter(r => r.shouldIntervene);

		if (interventionResults.length === 0) {
			console.log(
				'ℹ️ Orchestrator: no guidance sources recommend intervention',
			);
			return this.createNoGuidanceResult('No intervention recommended');
		}

		// Choose the highest priority (lowest priority number) intervention
		const chosenResult = interventionResults.reduce((best, current) =>
			current.priority < best.priority ? current : best,
		);

		console.log(
			`🎯 Selected guidance from source: ${chosenResult.source} (priority: ${chosenResult.priority})`,
		);

		return this.composeResponse(validResults, chosenResult);
	}

	/**
	 * Compose a response with attribution and transparency
	 */
	private composeResponse(
		allResults: GuidanceResult[],
		primaryResult: GuidanceResult,
	): GuidanceResult {
		const sourceCount = allResults.filter(r => !r.metadata?.['error']).length;

		return {
			...primaryResult,
			reasoning: `${primaryResult.reasoning} [Source: ${primaryResult.source}, analyzed by ${sourceCount} sources]`,
			metadata: {
				...primaryResult.metadata,
				analysisContext: {
					totalSources: allResults.length,
					sourcesAnalyzed: sourceCount,
					sourceResults: allResults.map(r => ({
						source: r.source,
						shouldIntervene: r.shouldIntervene,
						confidence: r.confidence,
						hasError: !!r.metadata?.['error'],
					})),
				},
			},
		};
	}

	/**
	 * Create a "no guidance" result
	 */
	private createNoGuidanceResult(reasoning: string): GuidanceResult {
		return {
			shouldIntervene: false,
			confidence: 0,
			reasoning,
			source: 'orchestrator',
			priority: 999,
			metadata: {
				noGuidanceReason: reasoning,
			},
		};
	}

	/**
	 * Update configuration for all sources that support it
	 */
	updateConfig(config: AutopilotConfig): void {
		this.config = config;

		// Update pattern source if it exists
		const patternSource = this.sources.get(
			'pattern-detection',
		) as PatternGuidanceSource;
		if (patternSource) {
			patternSource.updateConfig(config);
		}

		// Update context-aware source if it exists
		const contextSource = this.sources.get(
			'context-aware',
		) as ContextGuidanceSource;
		if (contextSource) {
			contextSource.updateConfig(config);
		}

		// Update guide prompt source if it exists
		const guidePromptSource = this.sources.get(
			'guide-prompt',
		) as GuidePromptGuidanceSource;
		if (guidePromptSource) {
			guidePromptSource.updateConfig(config);
		}

		console.log('🔄 Orchestrator: configuration updated');
	}

	/**
	 * Check if any guidance sources are available
	 */
	isAvailable(): boolean {
		// Pattern source is always available (doesn't depend on external APIs)
		const patternSource = this.sources.get('pattern-detection');
		if (patternSource) {
			return true;
		}

		// Fallback to guide prompt source availability
		const guidePromptSource = this.sources.get(
			'guide-prompt',
		) as GuidePromptGuidanceSource;
		return guidePromptSource ? guidePromptSource.isAvailable() : false;
	}

	/**
	 * Get debug information about the orchestrator state
	 */
	getDebugInfo(): object {
		return {
			sourceCount: this.sources.size,
			sources: Array.from(this.sources.values()).map(s => ({
				id: s.id,
				priority: s.priority,
				canShortCircuit: s.canShortCircuit,
			})),
			isAvailable: this.isAvailable(),
		};
	}
}
