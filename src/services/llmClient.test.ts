import {describe, it, expect, beforeEach, vi} from 'vitest';
import {LLMClient} from './llmClient.js';

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: mockCreate,
				},
			},
		})),
	};
});

describe('LLMClient', () => {
	let llmClient: LLMClient;

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock environment variable
		process.env['OPENAI_API_KEY'] = 'test-api-key';
		llmClient = new LLMClient();
	});

	describe('isAvailable', () => {
		it('should return true when API key is available', () => {
			expect(llmClient.isAvailable()).toBe(true);
		});

		it('should return false when API key is not available', () => {
			delete process.env['OPENAI_API_KEY'];
			const clientWithoutKey = new LLMClient();
			expect(clientWithoutKey.isAvailable()).toBe(false);
		});
	});

	describe('analyzeClaudeOutput', () => {
		it('should return intervention decision when Claude needs help', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								shouldIntervene: true,
								guidance: 'Try breaking this into smaller steps',
								confidence: 0.8,
								reasoning: 'Claude is repeating the same task',
							}),
						},
					},
				],
			};

			mockCreate.mockResolvedValue(mockResponse);

			const result = await llmClient.analyzeClaudeOutput(
				'Repeating the same task over and over',
			);

			expect(result.shouldIntervene).toBe(true);
			expect(result.guidance).toBe('Try breaking this into smaller steps');
			expect(result.confidence).toBe(0.8);
			expect(result.reasoning).toBe('Claude is repeating the same task');
		});

		it('should return no intervention when Claude is working normally', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								shouldIntervene: false,
								confidence: 0.3,
								reasoning: 'Claude is making normal progress',
							}),
						},
					},
				],
			};

			mockCreate.mockResolvedValue(mockResponse);

			const result = await llmClient.analyzeClaudeOutput(
				'Making good progress on the task',
			);

			expect(result.shouldIntervene).toBe(false);
			expect(result.guidance).toBeUndefined();
			expect(result.confidence).toBe(0.3);
		});

		it('should handle API errors gracefully', async () => {
			mockCreate.mockRejectedValue(new Error('API Error'));

			const result = await llmClient.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('Analysis failed');
		});

		it('should handle invalid JSON responses', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: 'Invalid JSON response',
						},
					},
				],
			};

			mockCreate.mockResolvedValue(mockResponse);

			const result = await llmClient.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toContain('Analysis failed');
		});

		it('should return no intervention when API is not available', async () => {
			delete process.env['OPENAI_API_KEY'];
			const clientWithoutKey = new LLMClient();

			const result = await clientWithoutKey.analyzeClaudeOutput('Some output');

			expect(result.shouldIntervene).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.reasoning).toBe('OpenAI API not available');
		});
	});
});
