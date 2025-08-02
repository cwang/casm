import {EventEmitter} from 'events';
import type {
	Session,
	AutopilotConfig,
	AutopilotDecision,
	AutopilotMonitorState,
} from '../types/index.js';
import {LLMClient} from './llmClient.js';
import stripAnsi from 'strip-ansi';

export class AutopilotMonitor extends EventEmitter {
	private llmClient: LLMClient;
	private config: AutopilotConfig;
	private analysisTimer?: NodeJS.Timeout;

	constructor(config: AutopilotConfig) {
		super();
		this.config = config;
		this.llmClient = new LLMClient();
	}

	isLLMAvailable(): boolean {
		return this.llmClient.isAvailable();
	}

	updateConfig(config: AutopilotConfig): void {
		this.config = config;
	}

	enable(session: Session): void {
		if (!session.autopilotState) {
			session.autopilotState = {
				isActive: false,
				guidancesProvided: 0,
				analysisInProgress: false,
			};
		}

		if (session.autopilotState.isActive) {
			return; // Already active
		}

		session.autopilotState.isActive = true;
		this.startMonitoring(session);
		this.emit('statusChanged', session, 'ACTIVE');
	}

	disable(session: Session): void {
		if (!session.autopilotState || !session.autopilotState.isActive) {
			return; // Already inactive
		}

		session.autopilotState.isActive = false;
		this.stopMonitoring();
		this.emit('statusChanged', session, 'STANDBY');
	}

	toggle(session: Session): boolean {
		if (!session.autopilotState || !session.autopilotState.isActive) {
			this.enable(session);
			return true;
		} else {
			this.disable(session);
			return false;
		}
	}

	getState(session: Session): AutopilotMonitorState | undefined {
		return session.autopilotState;
	}

	private startMonitoring(session: Session): void {
		this.stopMonitoring(); // Clear any existing timer

		this.analysisTimer = setInterval(() => {
			if (
				!session.autopilotState?.isActive ||
				session.autopilotState.analysisInProgress
			) {
				return;
			}

			this.analyzeSession(session);
		}, this.config.analysisDelayMs);
	}

	private stopMonitoring(): void {
		if (this.analysisTimer) {
			clearInterval(this.analysisTimer);
			this.analysisTimer = undefined;
		}
	}

	private async analyzeSession(session: Session): Promise<void> {
		if (!session.autopilotState || !this.isLLMAvailable()) {
			return;
		}

		// Check rate limiting
		if (!this.canProvideGuidance(session.autopilotState)) {
			return;
		}

		session.autopilotState.analysisInProgress = true;

		try {
			// Get recent output for analysis
			const recentOutput = this.getRecentOutput(session);
			if (!recentOutput.trim()) {
				return; // No output to analyze
			}

			const decision = await this.llmClient.analyzeClaudeOutput(
				recentOutput,
				this.config.model,
			);

			if (decision.shouldIntervene && decision.guidance) {
				this.provideGuidance(session, decision);
			}

			this.emit('analysisComplete', session, decision);
		} catch (error) {
			this.emit('analysisError', session, error);
		} finally {
			if (session.autopilotState) {
				session.autopilotState.analysisInProgress = false;
			}
		}
	}

	private canProvideGuidance(state: AutopilotMonitorState): boolean {
		if (!state.lastGuidanceTime) {
			return true; // First guidance
		}

		const hoursSinceLastGuidance =
			(Date.now() - state.lastGuidanceTime.getTime()) / (1000 * 60 * 60);

		// Reset counter if more than an hour has passed
		if (hoursSinceLastGuidance >= 1) {
			state.guidancesProvided = 0;
			return true;
		}

		return state.guidancesProvided < this.config.maxGuidancesPerHour;
	}

	private getRecentOutput(session: Session): string {
		// Get last few lines of output for analysis
		const recentLines = session.output.slice(-10);
		const output = recentLines.join('\n');
		return stripAnsi(output);
	}

	private provideGuidance(session: Session, decision: AutopilotDecision): void {
		if (!session.autopilotState || !decision.guidance) {
			return;
		}

		const guidanceMessage = `✈️ Auto-pilot: ${decision.guidance}\n`;

		// Send guidance to the PTY
		session.process.write(guidanceMessage);

		// Update state
		session.autopilotState.guidancesProvided++;
		session.autopilotState.lastGuidanceTime = new Date();

		this.emit('guidanceProvided', session, decision);
	}

	destroy(): void {
		this.stopMonitoring();
		this.removeAllListeners();
	}
}
