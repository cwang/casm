import {homedir} from 'os';
import {join} from 'path';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {
	ConfigurationData,
	StatusHookConfig,
	ShortcutConfig,
	WorktreeConfig,
	CommandConfig,
	CommandPreset,
	CommandPresetsConfig,
	AutopilotConfig,
	DEFAULT_SHORTCUTS,
} from '../types/index.js';
import {PatternLibrary} from './guidance/patternLibrary.js';

export class ConfigurationManager {
	private configPath: string;
	private legacyShortcutsPath: string;
	private configDir: string;
	private config: ConfigurationData = {};

	constructor() {
		// Determine config directory based on platform
		const homeDir = homedir();
		this.configDir =
			process.platform === 'win32'
				? join(
						process.env['APPDATA'] || join(homeDir, 'AppData', 'Roaming'),
						'ccmanager',
					)
				: join(homeDir, '.config', 'ccmanager');

		// Ensure config directory exists
		if (!existsSync(this.configDir)) {
			mkdirSync(this.configDir, {recursive: true});
		}

		this.configPath = join(this.configDir, 'config.json');
		this.legacyShortcutsPath = join(this.configDir, 'shortcuts.json');
		this.loadConfig();
	}

	private loadConfig(): void {
		// Try to load the new config file
		if (existsSync(this.configPath)) {
			try {
				const configData = readFileSync(this.configPath, 'utf-8');
				this.config = JSON.parse(configData);
			} catch (error) {
				console.error('Failed to load configuration:', error);
				this.config = {};
			}
		} else {
			// If new config doesn't exist, check for legacy shortcuts.json
			this.migrateLegacyShortcuts();
		}

		// Check if shortcuts need to be loaded from legacy file
		// This handles the case where config.json exists but doesn't have shortcuts
		if (!this.config.shortcuts && existsSync(this.legacyShortcutsPath)) {
			this.migrateLegacyShortcuts();
		}

		// Ensure default values
		if (!this.config.shortcuts) {
			this.config.shortcuts = DEFAULT_SHORTCUTS;
		}
		if (!this.config.statusHooks) {
			this.config.statusHooks = {};
		}
		if (!this.config.worktree) {
			this.config.worktree = {
				autoDirectory: false,
				copySessionData: true,
			};
		}
		if (
			!Object.prototype.hasOwnProperty.call(
				this.config.worktree,
				'copySessionData',
			)
		) {
			this.config.worktree.copySessionData = true;
		}
		if (!this.config.command) {
			this.config.command = {
				command: 'claude',
			};
		}

		// Migrate legacy command config to presets if needed
		this.migrateLegacyCommandToPresets();

		// Ensure default autopilot config
		if (!this.config.autopilot) {
			this.config.autopilot = {
				enabled: false,
				provider: 'openai',
				model: 'gpt-4.1',
				maxGuidancesPerHour: 20,
				analysisDelayMs: 3000,
				interventionThreshold: 0.5,
				learningConfig: {
					enabled: false,
					approvalRequired: true,
					retentionDays: 30,
					minPatternConfidence: 0.7,
				},
				apiKeys: {},
				patterns: {
					enabled: true,
					...PatternLibrary.getDefaultConfig(),
				},
			};
		}

		// Ensure apiKeys object exists for existing configs
		if (!this.config.autopilot.apiKeys) {
			this.config.autopilot.apiKeys = {};
		}

		// Migrate legacy configs without interventionThreshold
		if (typeof this.config.autopilot.interventionThreshold === 'undefined') {
			this.config.autopilot.interventionThreshold = 0.5;
		}

		// Ensure pattern config exists for existing autopilot configs
		if (!this.config.autopilot.patterns) {
			this.config.autopilot.patterns = {
				enabled: true,
				...PatternLibrary.getDefaultConfig(),
			};
		}

		// Ensure learning config exists for existing autopilot configs
		if (!this.config.autopilot.learningConfig) {
			this.config.autopilot.learningConfig = {
				enabled: false,
				approvalRequired: true,
				retentionDays: 30,
				minPatternConfidence: 0.7,
			};
		}
	}

	private migrateLegacyShortcuts(): void {
		if (existsSync(this.legacyShortcutsPath)) {
			try {
				const shortcutsData = readFileSync(this.legacyShortcutsPath, 'utf-8');
				const shortcuts = JSON.parse(shortcutsData);

				// Validate that it's a valid shortcuts config
				if (shortcuts && typeof shortcuts === 'object') {
					this.config.shortcuts = shortcuts;
					// Save to new config format
					this.saveConfig();
					console.log(
						'Migrated shortcuts from legacy shortcuts.json to config.json',
					);
				}
			} catch (error) {
				console.error('Failed to migrate legacy shortcuts:', error);
			}
		}
	}

	private saveConfig(): void {
		try {
			writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
		} catch (error) {
			console.error('Failed to save configuration:', error);
		}
	}

	getShortcuts(): ShortcutConfig {
		return this.config.shortcuts || DEFAULT_SHORTCUTS;
	}

	setShortcuts(shortcuts: ShortcutConfig): void {
		this.config.shortcuts = shortcuts;
		this.saveConfig();
	}

	getStatusHooks(): StatusHookConfig {
		return this.config.statusHooks || {};
	}

	setStatusHooks(hooks: StatusHookConfig): void {
		this.config.statusHooks = hooks;
		this.saveConfig();
	}

	getConfiguration(): ConfigurationData {
		return this.config;
	}

	setConfiguration(config: ConfigurationData): void {
		this.config = config;
		this.saveConfig();
	}

	getWorktreeConfig(): WorktreeConfig {
		return (
			this.config.worktree || {
				autoDirectory: false,
			}
		);
	}

	setWorktreeConfig(worktreeConfig: WorktreeConfig): void {
		this.config.worktree = worktreeConfig;
		this.saveConfig();
	}

	getCommandConfig(): CommandConfig {
		// For backward compatibility, return the default preset as CommandConfig
		const defaultPreset = this.getDefaultPreset();
		return {
			command: defaultPreset.command,
			args: defaultPreset.args,
			fallbackArgs: defaultPreset.fallbackArgs,
		};
	}

	setCommandConfig(commandConfig: CommandConfig): void {
		this.config.command = commandConfig;

		// Also update the default preset for backward compatibility
		if (this.config.commandPresets) {
			const defaultPreset = this.config.commandPresets.presets.find(
				p => p.id === this.config.commandPresets!.defaultPresetId,
			);
			if (defaultPreset) {
				defaultPreset.command = commandConfig.command;
				defaultPreset.args = commandConfig.args;
				defaultPreset.fallbackArgs = commandConfig.fallbackArgs;
			}
		}

		this.saveConfig();
	}

	private migrateLegacyCommandToPresets(): void {
		// Only migrate if we have legacy command config but no presets
		if (this.config.command && !this.config.commandPresets) {
			const defaultPreset: CommandPreset = {
				id: '1',
				name: 'Main',
				command: this.config.command.command,
				args: this.config.command.args,
				fallbackArgs: this.config.command.fallbackArgs,
			};

			this.config.commandPresets = {
				presets: [defaultPreset],
				defaultPresetId: '1',
			};

			this.saveConfig();
		}

		// Ensure default presets if none exist
		if (!this.config.commandPresets) {
			this.config.commandPresets = {
				presets: [
					{
						id: '1',
						name: 'Main',
						command: 'claude',
					},
				],
				defaultPresetId: '1',
			};
		}
	}

	getCommandPresets(): CommandPresetsConfig {
		if (!this.config.commandPresets) {
			this.migrateLegacyCommandToPresets();
		}
		return this.config.commandPresets!;
	}

	setCommandPresets(presets: CommandPresetsConfig): void {
		this.config.commandPresets = presets;
		this.saveConfig();
	}

	getDefaultPreset(): CommandPreset {
		const presets = this.getCommandPresets();
		const defaultPreset = presets.presets.find(
			p => p.id === presets.defaultPresetId,
		);

		// If default preset not found, return the first one
		return defaultPreset || presets.presets[0]!;
	}

	getPresetById(id: string): CommandPreset | undefined {
		const presets = this.getCommandPresets();
		return presets.presets.find(p => p.id === id);
	}

	addPreset(preset: CommandPreset): void {
		const presets = this.getCommandPresets();

		// Replace if exists, otherwise add
		const existingIndex = presets.presets.findIndex(p => p.id === preset.id);
		if (existingIndex >= 0) {
			presets.presets[existingIndex] = preset;
		} else {
			presets.presets.push(preset);
		}

		this.setCommandPresets(presets);
	}

	deletePreset(id: string): void {
		const presets = this.getCommandPresets();

		// Don't delete if it's the last preset
		if (presets.presets.length <= 1) {
			return;
		}

		// Remove the preset
		presets.presets = presets.presets.filter(p => p.id !== id);

		// Update default if needed
		if (presets.defaultPresetId === id && presets.presets.length > 0) {
			presets.defaultPresetId = presets.presets[0]!.id;
		}

		this.setCommandPresets(presets);
	}

	setDefaultPreset(id: string): void {
		const presets = this.getCommandPresets();

		// Only update if preset exists
		if (presets.presets.some(p => p.id === id)) {
			presets.defaultPresetId = id;
			this.setCommandPresets(presets);
		}
	}

	getSelectPresetOnStart(): boolean {
		const presets = this.getCommandPresets();
		return presets.selectPresetOnStart ?? false;
	}

	setSelectPresetOnStart(enabled: boolean): void {
		const presets = this.getCommandPresets();
		presets.selectPresetOnStart = enabled;
		this.setCommandPresets(presets);
	}

	getAutopilotConfig(): AutopilotConfig {
		return (
			this.config.autopilot || {
				enabled: false,
				provider: 'openai',
				model: 'gpt-4.1',
				maxGuidancesPerHour: 3,
				analysisDelayMs: 3000,
				interventionThreshold: 0.5, // Default moderate threshold
				learningConfig: {
					enabled: false,
					approvalRequired: true,
					retentionDays: 30,
					minPatternConfidence: 0.7,
				},
				apiKeys: {},
				patterns: {
					enabled: true,
					...PatternLibrary.getDefaultConfig(),
				},
			}
		);
	}

	setAutopilotConfig(autopilotConfig: AutopilotConfig): void {
		this.config.autopilot = autopilotConfig;
		this.saveConfig();
	}
}

export const configurationManager = new ConfigurationManager();
