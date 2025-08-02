import {describe, it, expect, beforeEach, vi} from 'vitest';
import {LLMClient} from './llmClient.js';
import type {AutopilotConfig} from '../types/index.js';

// Mock Vercel AI SDK
vi.mock('ai', () => ({
	generateText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
	openai: vi.fn().mockReturnValue('mock-openai-model'),
}));

vi.mock('@ai-sdk/anthropic', () => ({
	anthropic: vi.fn().mockReturnValue('mock-anthropic-model'),
}));

describe('LLMClient', () => {
	let llmClient: LLMClient;
	let mockConfig: AutopilotConfig;
	let mockGenerateText: any; // eslint-disable-line @typescript-eslint/no-explicit-any

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock environment variables
		process.env['OPENAI_API_KEY'] = 'test-openai-key';
		process.env['ANTHROPIC_API_KEY'] = 'test-anthropic-key';

		mockConfig = {
			enabled: true,
			provider: 'openai',
			model: 'gpt-4.1',
			maxGuidancesPerHour: 3,
			analysisDelayMs: 3000,
		};

		const ai = await import('ai');
		mockGenerateText = vi.mocked(ai.generateText);

		llmClient = new LLMClient(mockConfig);
	});

	describe('isAvailable', () => {
		it('should return true when API key is available', () => {
			expect(llmClient.isAvailable()).toBe(true);
		});

		it('should return false when API key is not available', () => {
			delete process.env['OPENAI_API_KEY'];
			const clientWithoutKey = new LLMClient(mockConfig);
			expect(clientWithoutKey.isAvailable()).toBe(false);
		});

		it('should work with different providers', () => {
			const anthropicConfig = {...mockConfig, provider: 'anthropic' as const};
			const anthropicClient = new LLMClient(anthropicConfig);
			expect(anthropicClient.isAvailable()).toBe(true);
		});
	});

	describe('provider information', () => {
		it('should return current provider name', () => {
			expect(llmClient.getCurrentProviderName()).toBe('OpenAI');
		});

		it('should return supported models for OpenAI', () => {
			const models = llmClient.getSupportedModels();
			expect(models).toContain('gpt-4.1');
			expect(models).toContain('o4-mini');
			expect(models).toContain('o3');
		});

		it('should return supported models for Anthropic', () => {
			const anthropicConfig = {...mockConfig, provider: 'anthropic' as const};
			const anthropicClient = new LLMClient(anthropicConfig);
			const models = anthropicClient.getSupportedModels();
			expect(models).toContain('claude-4-sonnet');
			expect(models).toContain('claude-4-opus');
		});

		it('should return available providers', () => {
			const providers = llmClient.getAvailableProviders();
			expect(providers).toHaveLength(2);
			expect(providers[0]).toMatchObject({
				name: 'OpenAI',
				available: true,
			});
			expect(providers[1]).toMatchObject({
				name: 'Anthropic',
				available: true,
			});
		});
	});

	describe('analyzeClaudeOutput', () => {
		it('should return intervention decision when Claude needs help', async () => {
			const mockResponse = {
				shouldIntervene: true,
				guidance: 'Try breaking this into smaller steps',
				confidence: 0.8,
				reasoning: 'Claude is repeating the same task',
			};

			mockGenerateText.mockResolvedValue({
				text: JSON.stringify(mockResponse),
			});

			const result = await llmClient.analyzeClaudeOutput(
				'Repeating the same task over and over',
			);

			expect(result).toEqual(mockResponse);
			expect(mockGenerateText).toHaveBeenCalledWith({
				model: 'mock-openai-model',
				prompt: expect.stringContaining('Claude Code terminal output'),
				temperature: 0.3,
			});
		});

		it('should return no intervention when Claude is working normally', async () => {
			const mockResponse = {
				shouldIntervene: false,
				confidence: 0.3,
				reasoning: 'Claude is making normal progress',
			};

			mockGenerateText.mockResolvedValue({
				text: JSON.stringify(mockResponse),
			});

			const result = await llmClient.analyzeClaudeOutput(
				'Making good progress on the task',
			);

			expect(result).toEqual(mockResponse);
		});

		it('should handle API errors gracefully', async () => {
			mockGenerateText.mockRejectedValue(new Error('API Error'));

			const result = await llmClient.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('Analysis failed');
		});

		it('should handle invalid JSON responses', async () => {
			mockGenerateText.mockResolvedValue({
				text: 'Invalid JSON response',
			});

			const result = await llmClient.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('Analysis failed');
		});

		it('should return no intervention when API key is not available', async () => {
			delete process.env['OPENAI_API_KEY'];
			const clientWithoutKey = new LLMClient(mockConfig);

			const result = await clientWithoutKey.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('API key not available');
		});

		it('should validate unsupported models', async () => {
			const invalidConfig = {...mockConfig, model: 'invalid-model'};
			const clientWithInvalidModel = new LLMClient(invalidConfig);

			const result =
				await clientWithInvalidModel.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('Unsupported model');
		});
	});

	describe('configuration updates', () => {
		it('should update configuration', () => {
			const newConfig: AutopilotConfig = {
				enabled: false,
				provider: 'anthropic',
				model: 'claude-3-5-sonnet-20241022',
				maxGuidancesPerHour: 5,
				analysisDelayMs: 2000,
			};

			llmClient.updateConfig(newConfig);
			expect(llmClient.getCurrentProviderName()).toBe('Anthropic');
		});
	});

	describe('static methods', () => {
		it('should return available providers statically', () => {
			const providers = LLMClient.getAvailableProviders();
			expect(providers).toHaveLength(2);
		});

		it('should return all supported models statically', () => {
			const modelsByProvider = LLMClient.getAllSupportedModels();
			expect(modelsByProvider).toHaveLength(2);
			expect(modelsByProvider[0]).toMatchObject({
				provider: 'OpenAI',
				models: expect.arrayContaining(['gpt-4.1']),
			});
		});
	});
});
