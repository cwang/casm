/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {render} from 'ink-testing-library';
import ConfigureAutopilot from './ConfigureAutopilot.js';
import {vi, describe, it, expect, beforeEach} from 'vitest';

// Mock ink to avoid stdin issues
vi.mock('ink', async () => {
	const actual = await vi.importActual<typeof import('ink')>('ink');
	return {
		...actual,
		useInput: vi.fn(),
	};
});

// Mock SelectInput to render items as simple text
vi.mock('ink-select-input', async () => {
	const React = await vi.importActual<typeof import('react')>('react');
	const {Text, Box} = await vi.importActual<typeof import('ink')>('ink');

	return {
		default: ({
			items,
			onSelect,
		}: {
			items: Array<{label: string; value: string}>;
			onSelect: (item: {value: string}) => void;
		}) => {
			// Store onSelect for test access
			(global as any).mockSelectInputOnSelect = onSelect;

			return React.createElement(
				Box,
				{flexDirection: 'column'},
				items.map((item: {label: string}, index: number) =>
					React.createElement(Text, {key: index}, item.label),
				),
			);
		},
	};
});

// Mock TextInput
vi.mock('ink-text-input', async () => {
	const React = await vi.importActual<typeof import('react')>('react');
	const {Text} = await vi.importActual<typeof import('ink')>('ink');

	return {
		default: ({
			value,
			onSubmit,
			placeholder,
		}: {
			value: string;
			onSubmit: () => void;
			placeholder: string;
		}) => {
			// Store onSubmit for test access
			(global as any).mockTextInputOnSubmit = onSubmit;

			return React.createElement(
				Text,
				{},
				`TextInput: ${value || placeholder}`,
			);
		},
	};
});

// Mock configurationManager
vi.mock('../services/configurationManager.js', () => ({
	configurationManager: {
		getAutopilotConfig: vi.fn(),
		setAutopilotConfig: vi.fn(),
	},
}));

describe('ConfigureAutopilot component', () => {
	const defaultConfig = {
		enabled: false,
		provider: 'openai' as const,
		model: 'gpt-4.1',
		maxGuidancesPerHour: 3,
		analysisDelayMs: 3000,
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		vi.mocked(configurationManager.getAutopilotConfig).mockReturnValue(
			defaultConfig,
		);
		// Clear global mocks
		(global as any).mockSelectInputOnSelect = undefined;
		(global as any).mockTextInputOnSubmit = undefined;
	});

	it('should render loading state when config is not loaded', async () => {
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		vi.mocked(configurationManager.getAutopilotConfig).mockReturnValue(
			null as any,
		);

		const onComplete = vi.fn();
		const {lastFrame} = render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Loading autopilot configuration...');
	});

	it('should render main menu with autopilot configuration options', async () => {
		const onComplete = vi.fn();

		const {lastFrame} = render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();

		expect(output).toContain('Configure Autopilot');
		expect(output).toContain('E ✈️  Enable Autopilot: OFF');
		expect(output).toContain('P 🤖  Provider: openai');
		expect(output).toContain('M 🧠  Model: gpt-4.1');
		expect(output).toContain('R ⏱️   Rate Limit: 3/hour');
		expect(output).toContain('D ⏰  Analysis Delay: 3000ms');
		expect(output).toContain('B ← Back to Configuration');
	});

	it('should show ON when autopilot is enabled', async () => {
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		vi.mocked(configurationManager.getAutopilotConfig).mockReturnValue({
			...defaultConfig,
			enabled: true,
		});

		const onComplete = vi.fn();
		const {lastFrame} = render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('E ✈️  Enable Autopilot: ON');
	});

	it('should toggle autopilot enabled state when toggle option is selected', async () => {
		const onComplete = vi.fn();

		render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Get the onSelect function from the global mock
		const onSelect = (global as any).mockSelectInputOnSelect;
		expect(onSelect).toBeDefined();

		// Simulate selecting the toggle option
		onSelect({value: 'toggle-enabled'});

		// Verify that setAutopilotConfig was called with enabled: true
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		expect(
			vi.mocked(configurationManager.setAutopilotConfig),
		).toHaveBeenCalledWith({
			...defaultConfig,
			enabled: true,
		});
	});

	it('should navigate to provider selection when provider option is selected', async () => {
		const onComplete = vi.fn();

		const {lastFrame, rerender} = render(
			<ConfigureAutopilot onComplete={onComplete} />,
		);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Get the onSelect function and simulate selecting provider
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'provider'});

		// Re-render to reflect state change
		rerender(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Select LLM Provider');
		expect(output).toContain('OpenAI');
		expect(output).toContain('Anthropic');
	});

	it('should change provider when a provider is selected', async () => {
		const onComplete = vi.fn();

		render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Navigate to provider selection
		let onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'provider'});

		// Clear the previous mock and get the new one for provider selection
		await new Promise(resolve => setTimeout(resolve, 10));
		onSelect = (global as any).mockSelectInputOnSelect;

		// Select Anthropic
		onSelect({value: 'anthropic'});

		// Verify that setAutopilotConfig was called with anthropic provider
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		expect(
			vi.mocked(configurationManager.setAutopilotConfig),
		).toHaveBeenCalledWith({
			...defaultConfig,
			provider: 'anthropic',
			model: 'claude-4-sonnet',
		});
	});

	it('should navigate to model selection when model option is selected', async () => {
		const onComplete = vi.fn();

		const {lastFrame, rerender} = render(
			<ConfigureAutopilot onComplete={onComplete} />,
		);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Get the onSelect function and simulate selecting model
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'model'});

		// Re-render to reflect state change
		rerender(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Select Model for OpenAI');
		expect(output).toContain('gpt-4.1');
		expect(output).toContain('o4-mini');
		expect(output).toContain('o3');
	});

	it('should show correct models for Anthropic provider', async () => {
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		vi.mocked(configurationManager.getAutopilotConfig).mockReturnValue({
			...defaultConfig,
			provider: 'anthropic',
			model: 'claude-4-sonnet',
		});

		const onComplete = vi.fn();

		const {lastFrame, rerender} = render(
			<ConfigureAutopilot onComplete={onComplete} />,
		);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Navigate to model selection
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'model'});

		// Re-render to reflect state change
		rerender(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Select Model for Anthropic');
		expect(output).toContain('claude-4-sonnet');
		expect(output).toContain('claude-4-opus');
	});

	it('should navigate to rate limit input when rate limit option is selected', async () => {
		const onComplete = vi.fn();

		const {lastFrame, rerender} = render(
			<ConfigureAutopilot onComplete={onComplete} />,
		);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Navigate to rate limit input
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'rate-limit'});

		// Re-render to reflect state change
		rerender(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Set Rate Limit (guidances per hour)');
		expect(output).toContain('Current: 3/hour');
		expect(output).toContain('TextInput: 3');
	});

	it('should navigate to delay input when delay option is selected', async () => {
		const onComplete = vi.fn();

		const {lastFrame, rerender} = render(
			<ConfigureAutopilot onComplete={onComplete} />,
		);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Navigate to delay input
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'delay'});

		// Re-render to reflect state change
		rerender(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		const output = lastFrame();
		expect(output).toContain('Set Analysis Delay (milliseconds)');
		expect(output).toContain('Current: 3000ms');
		expect(output).toContain('TextInput: 3000');
	});

	it('should call onComplete when back is selected from main menu', async () => {
		const onComplete = vi.fn();

		render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Select back option
		const onSelect = (global as any).mockSelectInputOnSelect;
		onSelect({value: 'back'});

		expect(onComplete).toHaveBeenCalled();
	});

	it('should handle keyboard shortcuts for main menu', async () => {
		const onComplete = vi.fn();

		render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Mock useInput to simulate keyboard input
		const {useInput} = await import('ink');
		const mockUseInput = vi.mocked(useInput);

		// Get the input handler function
		const inputHandler = mockUseInput.mock.calls[0]?.[0];
		expect(inputHandler).toBeDefined();

		// Simulate 'e' key press to toggle enabled
		if (inputHandler) {
			inputHandler('e', {} as any);
		}

		// Verify that setAutopilotConfig was called
		const {configurationManager} = await import(
			'../services/configurationManager.js'
		);
		expect(
			vi.mocked(configurationManager.setAutopilotConfig),
		).toHaveBeenCalledWith({
			...defaultConfig,
			enabled: true,
		});
	});

	it('should handle escape key to go back', async () => {
		const onComplete = vi.fn();

		render(<ConfigureAutopilot onComplete={onComplete} />);

		await new Promise(resolve => setTimeout(resolve, 100));

		// Mock useInput to simulate escape key
		const {useInput} = await import('ink');
		const mockUseInput = vi.mocked(useInput);

		// Get the input handler function
		const inputHandler = mockUseInput.mock.calls[0]?.[0];
		expect(inputHandler).toBeDefined();

		// Simulate escape key press
		if (inputHandler) {
			inputHandler('', {escape: true} as any);
		}

		expect(onComplete).toHaveBeenCalled();
	});
});
