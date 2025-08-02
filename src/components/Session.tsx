import React, {useEffect, useState, useRef} from 'react';
import {useStdout} from 'ink';
import {Session as SessionType} from '../types/index.js';
import {SessionManager} from '../services/sessionManager.js';
import {shortcutManager} from '../services/shortcutManager.js';
import {AutopilotMonitor} from '../services/autopilotMonitor.js';
import {configurationManager} from '../services/configurationManager.js';

interface SessionProps {
	session: SessionType;
	sessionManager: SessionManager;
	onReturnToMenu: () => void;
}

const Session: React.FC<SessionProps> = ({
	session,
	sessionManager,
	onReturnToMenu,
}) => {
	const {stdout} = useStdout();
	const [isExiting, setIsExiting] = useState(false);
	const [, setAutopilotStatus] = useState<string>('STANDBY');
	const [, setGuidancesProvided] = useState(0);
	const autopilotMonitorRef = useRef<AutopilotMonitor | null>(null);

	useEffect(() => {
		if (!stdout) return;

		// Clear screen when entering session
		stdout.write('\x1B[2J\x1B[H');

		// Handle session restoration
		const handleSessionRestore = (restoredSession: SessionType) => {
			if (restoredSession.id === session.id) {
				// Replay all buffered output, but skip the initial clear if present
				for (let i = 0; i < restoredSession.outputHistory.length; i++) {
					const buffer = restoredSession.outputHistory[i];
					if (!buffer) continue;

					const str = buffer.toString('utf8');

					// Skip clear screen sequences at the beginning
					if (i === 0 && (str.includes('\x1B[2J') || str.includes('\x1B[H'))) {
						// Skip this buffer or remove the clear sequence
						const cleaned = str
							.replace(/\x1B\[2J/g, '')
							.replace(/\x1B\[H/g, '');
						if (cleaned.length > 0) {
							stdout.write(Buffer.from(cleaned, 'utf8'));
						}
					} else {
						stdout.write(buffer);
					}
				}
			}
		};

		// Listen for restore event first
		sessionManager.on('sessionRestore', handleSessionRestore);

		// Mark session as active (this will trigger the restore event)
		sessionManager.setSessionActive(session.worktreePath, true);

		// Initialize auto-pilot monitor
		const autopilotConfig = configurationManager.getAutopilotConfig();
		const autopilotMonitor = new AutopilotMonitor(autopilotConfig);
		autopilotMonitorRef.current = autopilotMonitor;

		// Initialize autopilot state if needed
		if (!session.autopilotState) {
			session.autopilotState = {
				isActive: false,
				guidancesProvided: 0,
				analysisInProgress: false,
			};
		}

		// Auto-enable autopilot if enabled globally and LLM is available
		if (autopilotConfig.enabled && autopilotMonitor.isLLMAvailable() && !session.autopilotState.isActive) {
			autopilotMonitor.enable(session);
			if (stdout) {
				stdout.write('\n✈️ Auto-pilot: ACTIVE (globally enabled)\n');
			}
		}

		// Update initial state
		setAutopilotStatus(session.autopilotState.isActive ? 'ACTIVE' : 'STANDBY');
		setGuidancesProvided(session.autopilotState.guidancesProvided);

		// Auto-pilot event handlers
		const handleAutopilotStatusChange = (
			changedSession: SessionType,
			status: string,
		) => {
			if (changedSession.id === session.id) {
				setAutopilotStatus(status);
			}
		};

		const handleGuidanceProvided = (changedSession: SessionType) => {
			if (changedSession.id === session.id && changedSession.autopilotState) {
				setGuidancesProvided(changedSession.autopilotState.guidancesProvided);
			}
		};

		autopilotMonitor.on('statusChanged', handleAutopilotStatusChange);
		autopilotMonitor.on('guidanceProvided', handleGuidanceProvided);

		// Immediately resize the PTY and terminal to current dimensions
		// This fixes rendering issues when terminal width changed while in menu
		// https://github.com/kbwo/ccmanager/issues/2
		const currentCols = process.stdout.columns || 80;
		const currentRows = process.stdout.rows || 24;

		// Do not delete try-catch
		// Prevent ccmanager from exiting when claude process has already exited
		try {
			session.process.resize(currentCols, currentRows);
			if (session.terminal) {
				session.terminal.resize(currentCols, currentRows);
			}
		} catch {
			/* empty */
		}

		// Listen for session data events
		const handleSessionData = (activeSession: SessionType, data: string) => {
			// Only handle data for our session
			if (activeSession.id === session.id && !isExiting) {
				stdout.write(data);
			}
		};

		const handleSessionExit = (exitedSession: SessionType) => {
			if (exitedSession.id === session.id) {
				setIsExiting(true);
				// Don't call onReturnToMenu here - App component handles it
			}
		};

		sessionManager.on('sessionData', handleSessionData);
		sessionManager.on('sessionExit', handleSessionExit);

		// Handle terminal resize
		const handleResize = () => {
			const cols = process.stdout.columns || 80;
			const rows = process.stdout.rows || 24;
			session.process.resize(cols, rows);
			// Also resize the virtual terminal
			if (session.terminal) {
				session.terminal.resize(cols, rows);
			}
		};

		stdout.on('resize', handleResize);

		// Set up raw input handling
		const stdin = process.stdin;

		// Store original stdin state
		const originalIsRaw = stdin.isRaw;
		const originalIsPaused = stdin.isPaused();

		// Configure stdin for PTY passthrough
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');

		const handleStdinData = (data: string) => {
			if (isExiting) return;

			// Check for auto-pilot toggle
			if (data === 'p' && autopilotMonitorRef.current) {
				const monitor = autopilotMonitorRef.current;
				if (monitor.isLLMAvailable()) {
					const isActive = monitor.toggle(session);
					const status = isActive ? 'ACTIVE' : 'STANDBY';
					setAutopilotStatus(status);
					// Display status message in terminal (not sent to Claude Code)
					if (stdout) {
						stdout.write(`\n✈️ Auto-pilot: ${status}\n`);
					}
				} else {
					// Show message that API key is needed
					if (stdout) {
						stdout.write('\n✈️ Auto-pilot: API key required (configure in settings)\n');
					}
				}
				return;
			}

			// Check for return to menu shortcut
			const returnToMenuShortcut = shortcutManager.getShortcuts().returnToMenu;
			const shortcutCode =
				shortcutManager.getShortcutCode(returnToMenuShortcut);

			if (shortcutCode && data === shortcutCode) {
				// Disable focus reporting mode before returning to menu
				if (stdout) {
					stdout.write('\x1b[?1004l');
				}
				// Restore stdin state before returning to menu
				stdin.removeListener('data', handleStdinData);
				stdin.setRawMode(false);
				stdin.pause();
				onReturnToMenu();
				return;
			}

			// Pass all other input directly to the PTY
			session.process.write(data);
		};

		stdin.on('data', handleStdinData);

		return () => {
			// Remove listener first to prevent any race conditions
			stdin.removeListener('data', handleStdinData);

			// Disable focus reporting mode that might have been enabled by the PTY
			if (stdout) {
				stdout.write('\x1b[?1004l');
			}

			// Restore stdin to its original state
			if (stdin.isTTY) {
				stdin.setRawMode(originalIsRaw || false);
				if (originalIsPaused) {
					stdin.pause();
				} else {
					stdin.resume();
				}
			}

			// Cleanup auto-pilot monitor
			if (autopilotMonitorRef.current) {
				autopilotMonitorRef.current.disable(session);
				autopilotMonitorRef.current.destroy();
				autopilotMonitorRef.current = null;
			}

			// Mark session as inactive
			sessionManager.setSessionActive(session.worktreePath, false);

			// Remove event listeners
			sessionManager.off('sessionRestore', handleSessionRestore);
			sessionManager.off('sessionData', handleSessionData);
			sessionManager.off('sessionExit', handleSessionExit);
			stdout.off('resize', handleResize);
		};
	}, [session, sessionManager, stdout, onReturnToMenu, isExiting]);

	// Return null to render nothing (PTY output goes directly to stdout)
	// Auto-pilot status is displayed via the PTY output when toggled
	return null;
};

export default Session;
