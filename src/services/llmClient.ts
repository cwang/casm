import OpenAI from 'openai';
import type {AutopilotDecision} from '../types/index.js';

export class LLMClient {
	private openai: OpenAI | null = null;

	constructor() {
		const apiKey = process.env['OPENAI_API_KEY'];
		if (apiKey) {
			this.openai = new OpenAI({apiKey});
		}
	}

	isAvailable(): boolean {
		return this.openai !== null;
	}

	async analyzeClaudeOutput(
		output: string,
		model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4',
	): Promise<AutopilotDecision> {
		if (!this.openai) {
			return {
				shouldIntervene: false,
				confidence: 0,
				reasoning: 'OpenAI API not available',
			};
		}

		try {
			const prompt = this.buildAnalysisPrompt(output);

			const response = await this.openai.chat.completions.create({
				model,
				messages: [
					{
						role: 'system',
						content:
							'You are an AI assistant monitoring Claude Code sessions. Your job is to detect when Claude needs guidance and provide brief, actionable suggestions. Respond with JSON only.',
					},
					{role: 'user', content: prompt},
				],
				temperature: 0.3,
				max_tokens: 200,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error('No response content');
			}

			// Parse JSON response
			const decision = JSON.parse(content) as AutopilotDecision;

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
Analyze this Claude Code terminal output and determine if Claude needs guidance.

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
}
