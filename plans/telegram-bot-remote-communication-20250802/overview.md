# Telegram Bot Remote Communication Feature

## Feature Overview

This feature adds remote communication capabilities to CCManager, allowing users to interact with Claude Code sessions when away from their computer through Telegram messaging.

## Core Requirements

### Away-From-Computer Mode
- Toggle indicator for "away-from-computer-but-work" mode per worktree/workspace
- Visual UI component to enable/disable remote communication
- Persistent state storage for communication preferences

### Communication Channel Selection
- Support for Telegram (initial implementation)
- Framework for future Slack integration
- Channel-specific configuration and authentication

### Message Type Selection
- Text messages (supported by both Telegram and Slack)
- Voice messages (Telegram-specific feature)
- Automatic message type validation based on selected channel

### Bidirectional Communication
- Send Claude Code responses to selected communication channel
- Receive input from communication channel and forward to Claude Code session
- Maintain session context and continuity

### Context Clarity
- Every message includes repository identification
- Worktree/workspace information in all communications
- Clear attribution to prevent cross-session confusion

### State Management
- Clean shutdown when indicator is switched off
- No external communications after deactivation
- Proper cleanup of communication resources

## Success Criteria

1. Users can enable remote communication for specific worktrees
2. Telegram bot successfully sends Claude Code responses as text or voice
3. Telegram input is properly forwarded to correct Claude Code session
4. All messages clearly identify repo and worktree context
5. Clean state transitions when toggling on/off
6. No cross-contamination between different worktree sessions