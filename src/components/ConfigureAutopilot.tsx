import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {AutopilotConfig} from '../types/index.js';
import {configurationManager} from '../services/configurationManager.js';

interface ConfigureAutopilotProps {
	onComplete: () => void;
}

type ConfigView = 'menu' | 'provider' | 'model' | 'rate-limit' | 'delay';

interface MenuItem {
	label: string;
	value: string;
}

const ConfigureAutopilot: React.FC<ConfigureAutopilotProps> = ({
	onComplete,
}) => {
	const [view, setView] = useState<ConfigView>('menu');
	const [config, setConfig] = useState<AutopilotConfig | null>(null);
	const [inputValue, setInputValue] = useState<string>('');

	useEffect(() => {
		const currentConfig = configurationManager.getAutopilotConfig();
		setConfig(currentConfig);
	}, []);

	const saveConfig = (newConfig: AutopilotConfig) => {
		configurationManager.setAutopilotConfig(newConfig);
		setConfig(newConfig);
	};

	const menuItems: MenuItem[] = [
		{
			label: `E ✈️  Enable Autopilot: ${config?.enabled ? 'ON' : 'OFF'}`,
			value: 'toggle-enabled',
		},
		{
			label: `P 🤖  Provider: ${config?.provider || 'openai'}`,
			value: 'provider',
		},
		{
			label: `M 🧠  Model: ${config?.model || 'gpt-4'}`,
			value: 'model',
		},
		{
			label: `R ⏱️   Rate Limit: ${config?.maxGuidancesPerHour || 3}/hour`,
			value: 'rate-limit',
		},
		{
			label: `D ⏰  Analysis Delay: ${config?.analysisDelayMs || 3000}ms`,
			value: 'delay',
		},
		{
			label: 'B ← Back to Configuration',
			value: 'back',
		},
	];

	const providerItems: MenuItem[] = [
		{label: 'OpenAI', value: 'openai'},
		{label: 'Anthropic', value: 'anthropic'},
		{label: '← Back', value: 'back'},
	];

	const getModelItems = (provider: string): MenuItem[] => {
		const models =
			provider === 'openai'
				? ['gpt-4.1', 'o4-mini', 'o3']
				: ['claude-4-sonnet', 'claude-4-opus'];

		return [
			...models.map(model => ({label: model, value: model})),
			{label: '← Back', value: 'back'},
		];
	};

	const getProviderInitialIndex = (): number => {
		if (!config) return 0;
		return providerItems.findIndex(item => item.value === config.provider);
	};

	const getModelInitialIndex = (): number => {
		if (!config) return 0;
		const modelItems = getModelItems(config.provider);
		return modelItems.findIndex(item => item.value === config.model);
	};

	const handleSelect = (item: MenuItem) => {
		if (!config) return;

		if (item.value === 'back') {
			if (view === 'menu') {
				onComplete();
			} else {
				setView('menu');
			}
		} else if (item.value === 'toggle-enabled') {
			saveConfig({...config, enabled: !config.enabled});
		} else if (item.value === 'provider') {
			setView('provider');
		} else if (item.value === 'model') {
			setView('model');
		} else if (item.value === 'rate-limit') {
			setInputValue(config.maxGuidancesPerHour.toString());
			setView('rate-limit');
		} else if (item.value === 'delay') {
			setInputValue(config.analysisDelayMs.toString());
			setView('delay');
		} else if (view === 'provider') {
			if (item.value === 'openai' || item.value === 'anthropic') {
				const defaultModel =
					item.value === 'openai' ? 'gpt-4.1' : 'claude-4-sonnet';
				saveConfig({
					...config,
					provider: item.value as 'openai' | 'anthropic',
					model: defaultModel,
				});
				setView('menu');
			}
		} else if (view === 'model') {
			saveConfig({...config, model: item.value});
			setView('menu');
		}
	};

	const handleInputSubmit = () => {
		if (!config) return;

		const numValue = parseInt(inputValue);
		if (isNaN(numValue) || numValue < 0) {
			setView('menu');
			return;
		}

		if (view === 'rate-limit') {
			saveConfig({...config, maxGuidancesPerHour: Math.max(1, numValue)});
		} else if (view === 'delay') {
			saveConfig({...config, analysisDelayMs: Math.max(1000, numValue)});
		}

		setView('menu');
		setInputValue('');
	};

	// Handle hotkeys (only when in menu view)
	useInput((input, key) => {
		if (view !== 'menu') return;

		const keyPressed = input.toLowerCase();

		switch (keyPressed) {
			case 'e':
				if (config) {
					saveConfig({...config, enabled: !config.enabled});
				}
				break;
			case 'p':
				setView('provider');
				break;
			case 'm':
				setView('model');
				break;
			case 'r':
				if (config) {
					setInputValue(config.maxGuidancesPerHour.toString());
					setView('rate-limit');
				}
				break;
			case 'd':
				if (config) {
					setInputValue(config.analysisDelayMs.toString());
					setView('delay');
				}
				break;
			case 'b':
				onComplete();
				break;
		}

		// Handle escape key
		if (key.escape) {
			onComplete();
		}
	});

	if (!config) {
		return (
			<Box>
				<Text>Loading autopilot configuration...</Text>
			</Box>
		);
	}

	if (view === 'provider') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Select LLM Provider
					</Text>
				</Box>
				<SelectInput
					items={providerItems}
					onSelect={handleSelect}
					isFocused={true}
					initialIndex={getProviderInitialIndex()}
				/>
			</Box>
		);
	}

	if (view === 'model') {
		const modelItems = getModelItems(config.provider);
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Select Model for{' '}
						{config.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
					</Text>
				</Box>
				<SelectInput
					items={modelItems}
					onSelect={handleSelect}
					isFocused={true}
					initialIndex={getModelInitialIndex()}
				/>
			</Box>
		);
	}

	if (view === 'rate-limit') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Set Rate Limit (guidances per hour)
					</Text>
				</Box>
				<Box marginBottom={1}>
					<Text dimColor>Current: {config.maxGuidancesPerHour}/hour</Text>
				</Box>
				<Box>
					<Text>Rate limit: </Text>
					<TextInput
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleInputSubmit}
						focus={true}
						placeholder="Enter number (minimum 1)"
					/>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press Enter to save, Escape to cancel</Text>
				</Box>
			</Box>
		);
	}

	if (view === 'delay') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Set Analysis Delay (milliseconds)
					</Text>
				</Box>
				<Box marginBottom={1}>
					<Text dimColor>Current: {config.analysisDelayMs}ms</Text>
				</Box>
				<Box>
					<Text>Delay: </Text>
					<TextInput
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleInputSubmit}
						focus={true}
						placeholder="Enter delay in ms (minimum 1000)"
					/>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press Enter to save, Escape to cancel</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color="green">
					Configure Autopilot
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>
					Configure AI-powered session monitoring and guidance:
				</Text>
			</Box>

			<SelectInput
				items={menuItems}
				onSelect={handleSelect}
				isFocused={true}
				limit={10}
			/>

			<Box marginTop={1}>
				<Text dimColor>
					Autopilot monitors Claude Code sessions and provides guidance when
					needed.
				</Text>
			</Box>
		</Box>
	);
};

export default ConfigureAutopilot;
