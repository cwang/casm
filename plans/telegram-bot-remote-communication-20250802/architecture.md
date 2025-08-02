# Architecture Design

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CCManager Core                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   Session Mgr   │  │ Remote Comm Mgr  │  │   Worktree Mgr  │ │
│  │                 │  │                  │  │                 │ │
│  │ - Claude Code   │◄─┤ - Channel Router │  │ - Git Operations│ │
│  │   Sessions      │  │ - Message Queue  │  │ - State Tracking│ │
│  │ - PTY Management│  │ - State Sync     │  │                 │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Communication Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Telegram Client │  │  Message Formatter│  │  Voice Synthesis│ │
│  │                 │  │                  │  │                 │ │
│  │ - Bot API       │  │ - Context Labels │  │ - Text-to-Speech│ │
│  │ - Webhooks      │  │ - Rich Formatting│  │ - Audio Encoding│ │
│  │ - Authentication│  │ - Error Handling │  │                 │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Remote Communication Manager
**Location**: `src/services/remoteCommunicationManager.ts`

**Responsibilities**:
- Coordinate between session management and communication channels
- Route messages to appropriate worktree sessions
- Manage communication state per worktree
- Handle channel-specific message formatting

**Key Methods**:
```typescript
class RemoteCommunicationManager {
  enableCommunication(worktreePath: string, config: CommunicationConfig): Promise<void>
  disableCommunication(worktreePath: string): Promise<void>
  sendMessage(worktreePath: string, message: string, type: 'text' | 'voice'): Promise<void>
  handleIncomingMessage(channelId: string, message: string): Promise<void>
}
```

### Telegram Service
**Location**: `src/services/telegram/telegramService.ts`

**Responsibilities**:
- Telegram Bot API integration
- Message sending (text and voice)
- Webhook handling for incoming messages
- Authentication and bot token management

**Key Methods**:
```typescript
class TelegramService implements CommunicationChannel {
  authenticate(token: string): Promise<boolean>
  sendTextMessage(chatId: string, text: string): Promise<void>
  sendVoiceMessage(chatId: string, audioBuffer: Buffer): Promise<void>
  setupWebhook(url: string): Promise<void>
}
```

### Voice Synthesis Service
**Location**: `src/services/voiceSynthesis.ts`

**Responsibilities**:
- Convert text responses to audio
- Audio format optimization for Telegram
- Caching for performance

**Key Methods**:
```typescript
class VoiceSynthesisService {
  synthesize(text: string, options: VoiceOptions): Promise<Buffer>
  getAvailableVoices(): Promise<Voice[]>
}
```

### Communication Channel Interface
**Location**: `src/types/communication.ts`

```typescript
interface CommunicationChannel {
  id: string
  name: string
  supportedMessageTypes: MessageType[]
  authenticate(credentials: any): Promise<boolean>
  sendMessage(recipient: string, message: string, type: MessageType): Promise<void>
  onMessage(callback: (message: IncomingMessage) => void): void
}

interface CommunicationConfig {
  channelId: string
  messageType: MessageType
  credentials: any
  worktreeContext: WorktreeContext
}

interface WorktreeContext {
  repoName: string
  worktreePath: string
  branchName: string
}
```

## Data Flow

### Outgoing Messages (Claude Code → Telegram)
1. Session Manager detects Claude Code output
2. Remote Communication Manager formats message with context
3. Channel-specific service sends message (text or voice)
4. Message includes repo/worktree identification

### Incoming Messages (Telegram → Claude Code)
1. Telegram webhook receives message
2. Remote Communication Manager identifies target session
3. Message forwarded to Session Manager
4. Session Manager sends input to Claude Code PTY

## State Management

### Communication State
```typescript
interface CommunicationState {
  worktreePath: string
  enabled: boolean
  channelConfig: CommunicationConfig
  lastActivity: Date
  messageQueue: QueuedMessage[]
}
```

### Persistence
- Communication configurations stored in `~/.config/ccmanager/communication.json`
- State synchronized with UI components
- Cleanup on application shutdown

## Error Handling

### Network Failures
- Retry mechanisms for API calls
- Graceful degradation when communication unavailable
- User notification of connection issues

### Authentication Errors
- Token validation on startup
- Re-authentication prompts
- Secure credential storage

### Context Mismatches
- Validation of worktree existence before message forwarding
- Error messages for invalid session targets
- Logging for debugging cross-session issues