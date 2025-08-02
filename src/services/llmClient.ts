import {generateText, type LanguageModel} from 'ai';
import {openai} from '@ai-sdk/openai';
import {anthropic} from '@ai-sdk/anthropic';
import type {AutopilotDecision, AutopilotConfig} from '../types/index.js';

type SupportedProvider = 'openai' | 'anthropic';

interface ProviderInfo {
	name: string;
	models: string[];
	createModel: (modelName: string) => LanguageModel;
	requiresKey: string;
}

const PROVIDERS: Record<SupportedProvider, ProviderInfo> = {
	openai: {
		name: 'OpenAI',
		models: ['gpt-4.1', 'o4-mini', 'o3'],
		createModel: (model: string) => openai(model),
		requiresKey: 'OPENAI_API_KEY',
	},
	anthropic: {
		name: 'Anthropic',
		models: ['claude-4-sonnet', 'claude-4-opus'],
		createModel: (model: string) => anthropic(model),
		requiresKey: 'ANTHROPIC_API_KEY',
	},
};

export class LLMClient {
	private config: AutopilotConfig;

	constructor(config: AutopilotConfig) {
		this.config = config;
	}

	updateConfig(config: AutopilotConfig): void {
		this.config = config;
	}

	isAvailable(): boolean {
		const provider = PROVIDERS[this.config.provider];
		if (!provider) return false;

		const apiKey = process.env[provider.requiresKey];
		return Boolean(apiKey);
	}

	getCurrentProviderName(): string {
		const provider = PROVIDERS[this.config.provider];
		return provider?.name ?? 'Unknown';
	}

	getSupportedModels(): string[] {
		const provider = PROVIDERS[this.config.provider];
		return provider?.models ?? [];
	}

	getAvailableProviders(): Array<{
		name: string;
		models: string[];
		available: boolean;
	}> {
		return Object.entries(PROVIDERS).map(([_key, provider]) => ({
			name: provider.name,
			models: provider.models,
			available: Boolean(process.env[provider.requiresKey]),
		}));
	}

	async analyzeClaudeOutput(output: string): Promise<AutopilotDecision> {
		if (!this.isAvailable()) {
			const provider = PROVIDERS[this.config.provider];
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: `${provider?.name ?? 'Provider'} API key not available (${provider?.requiresKey})`,
			};
		}

		const provider = PROVIDERS[this.config.provider];
		if (!provider) {
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: `Unknown provider: ${this.config.provider}`,
			};
		}

		if (!provider.models.includes(this.config.model)) {
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: `Unsupported model: ${this.config.model} for provider ${provider.name}`,
			};
		}

		try {
			const model = provider.createModel(this.config.model);
			const prompt = this.buildAnalysisPrompt(output);

			const {text} = await generateText({
				model,
				prompt,
				temperature: 0.3,
			});

			// Parse JSON response
			const decision = JSON.parse(text) as AutopilotDecision;

			// Validate response structure
			if (
				typeof decision.shouldIntervene !== 'boolean' ||
				typeof decision.confidence !== 'number' ||
				typeof decision.reasoning !== 'string'
			) {
				throw new Error('Invalid response structure');
			}

			return decision;
		} catch (error) {
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	private buildAnalysisPrompt(output: string): string {
		return `
You are an AI assistant monitoring Claude Code sessions. Your job is to detect when Claude needs guidance and provide brief, actionable suggestions.

Analyze this Claude Code terminal output and determine if Claude needs guidance:

TERMINAL OUTPUT:
${output}

Look for patterns indicating Claude needs help:
- Repetitive behavior or loops
- Error messages being ignored
- Confusion or uncertainty in responses
- Getting stuck on the same task
- Making the same mistakes repeatedly
- Overthinking simple problems

Respond with JSON in this exact format:
{
  "shouldIntervene": boolean,
  "guidance": "Brief actionable suggestion (max 60 chars)" or null,
  "confidence": number (0-1),
  "reasoning": "Why you made this decision"
}

Guidelines:
- Only intervene for clear issues (confidence > 0.7)
- Keep guidance brief and actionable
- Don't intervene for normal progress or minor issues
- Focus on patterns, not single mistakes
`.trim();
	}

	// Static methods for provider discovery
	static getAvailableProviders(): Array<{
		name: string;
		models: string[];
		available: boolean;
	}> {
		return Object.entries(PROVIDERS).map(([_key, provider]) => ({
			name: provider.name,
			models: provider.models,
			available: Boolean(process.env[provider.requiresKey]),
		}));
	}

	static getAllSupportedModels(): Array<{provider: string; models: string[]}> {
		return Object.entries(PROVIDERS).map(([_key, provider]) => ({
			provider: provider.name,
			models: provider.models,
		}));
	}
}
