# Modular Communication Architecture

## Overview

This document outlines a modular, plugin-based architecture for remote communication that can be easily integrated into any terminal/CLI management tool, not just CCManager. The design uses the adapter pattern to support multiple communication channels and provides clear integration points for external projects.

## Core Design Principles

### 1. **Separation of Concerns**
- **Communication Layer**: Abstract interface for all external communication
- **Channel Adapters**: Platform-specific implementations (Telegram, Slack, etc.)
- **Message Processing**: Channel-agnostic message formatting and routing
- **Integration Points**: Clean APIs for host application integration

### 2. **Plugin Architecture**
- Each communication channel is a separate plugin/adapter
- Hot-swappable adapters without core system changes
- Independent versioning and updates per adapter
- Minimal dependencies between adapters

### 3. **Host Application Agnostic**
- Core communication system doesn't depend on CCManager specifics
- Clear integration contracts for any CLI/terminal tool
- Configurable hooks for different host application needs
- Standardized configuration interfaces

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Host Application                             │
│                     (CCManager, Vim, etc.)                         │
├─────────────────────────────────────────────────────────────────────┤
│                    Integration Interface                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Session Hook    │  │ Config Hook  │  │ Message Hook            │ │
│  │ Interface       │  │ Interface    │  │ Interface               │ │
│  └─────────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Remote Communication Core                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ Communication   │  │  Message Router  │  │  Session Manager    │ │
│  │ Orchestrator    │  │                  │  │                     │ │
│  │                 │  │ - Context        │  │ - Session Mapping   │ │
│  │ - Plugin Mgmt   │  │   Labeling       │  │ - State Tracking    │ │
│  │ - Channel Router│  │ - Format         │  │ - Hook Management   │ │
│  │ - State Sync    │  │   Conversion     │  │                     │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Communication Adapters                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ Telegram        │  │  Slack Adapter   │  │  Future Adapters    │ │
│  │ Adapter         │  │                  │  │                     │ │
│  │                 │  │ - Slack Bot API  │  │ - Discord           │ │
│  │ - Bot API       │  │ - Webhook        │  │ - MS Teams          │ │
│  │ - Webhook       │  │ - Message        │  │ - Email             │ │
│  │ - Voice TTS     │  │   Formatting     │  │ - SMS               │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      External Services                              │
│        (Telegram API, Slack API, TTS Services, etc.)               │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### 1. Communication Channel Interface

```typescript
interface CommunicationChannel {
  // Channel identification
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly supportedFeatures: ChannelFeature[];

  // Connection management
  connect(config: ChannelConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): ChannelStatus;

  // Message handling
  sendMessage(message: OutgoingMessage): Promise<MessageResult>;
  onMessage(handler: (message: IncomingMessage) => void): void;
  
  // Configuration
  validateConfig(config: ChannelConfig): ValidationResult;
  getConfigSchema(): ConfigSchema;
  
  // Capabilities
  getSupportedMessageTypes(): MessageType[];
  getCapabilities(): ChannelCapabilities;
}

interface ChannelFeature {
  name: string;
  version: string;
  required: boolean;
  description: string;
}

interface ChannelCapabilities {
  messageTypes: MessageType[];
  maxMessageLength: number;
  supportsRichText: boolean;
  supportsVoice: boolean;
  supportsFiles: boolean;
  rateLimits: RateLimit[];
}
```

### 2. Message Interfaces

```typescript
interface OutgoingMessage {
  id: string;
  content: string;
  type: MessageType;
  context: MessageContext;
  metadata: MessageMetadata;
  options?: MessageOptions;
}

interface IncomingMessage {
  id: string;
  content: string;
  type: MessageType;
  sender: MessageSender;
  timestamp: Date;
  context?: MessageContext;
  metadata: MessageMetadata;
}

interface MessageContext {
  sessionId: string;
  workspaceId: string;
  repositoryName: string;
  branchName: string;
  workspacePath: string;
  hostApplication: string;
}

interface MessageOptions {
  priority: MessagePriority;
  retryPolicy: RetryPolicy;
  formatting: MessageFormatting;
  voiceOptions?: VoiceOptions;
}

type MessageType = 'text' | 'voice' | 'file' | 'image' | 'command';
type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
```

### 3. Host Application Integration Interface

```typescript
interface HostApplicationIntegration {
  // Session management
  onSessionOutput(handler: (sessionId: string, output: string) => void): void;
  onSessionStateChange(handler: (sessionId: string, state: SessionState) => void): void;
  sendSessionInput(sessionId: string, input: string): Promise<void>;
  
  // Configuration
  getWorkspaceInfo(sessionId: string): WorkspaceInfo;
  getSessionInfo(sessionId: string): SessionInfo;
  
  // UI integration (optional)
  showNotification?(message: string, type: NotificationType): void;
  updateStatusIndicator?(sessionId: string, status: CommunicationStatus): void;
}

interface WorkspaceInfo {
  path: string;
  repositoryName: string;
  branchName: string;
  hasChanges: boolean;
  ahead: number;
  behind: number;
}

interface SessionInfo {
  id: string;
  command: string;
  state: SessionState;
  startTime: Date;
  lastActivity: Date;
}
```

## Plugin Architecture

### 1. Adapter Plugin Structure

```typescript
interface AdapterPlugin {
  // Plugin metadata
  readonly manifest: PluginManifest;
  
  // Lifecycle
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  dispose(): Promise<void>;
  
  // Factory
  createChannel(config: ChannelConfig): Promise<CommunicationChannel>;
  
  // Configuration
  getDefaultConfig(): ChannelConfig;
  validateConfig(config: ChannelConfig): ValidationResult;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  dependencies: PluginDependency[];
  permissions: Permission[];
  configSchema: ConfigSchema;
}

interface PluginContext {
  logger: Logger;
  storage: PluginStorage;
  secrets: SecretManager;
  eventBus: EventBus;
  httpClient: HttpClient;
}
```

### 2. Plugin Discovery and Loading

```typescript
class PluginManager {
  private plugins: Map<string, AdapterPlugin> = new Map();
  private channels: Map<string, CommunicationChannel> = new Map();
  
  async discoverPlugins(searchPaths: string[]): Promise<PluginManifest[]>;
  async loadPlugin(pluginPath: string): Promise<AdapterPlugin>;
  async unloadPlugin(pluginId: string): Promise<void>;
  
  getAvailablePlugins(): PluginManifest[];
  getActivePlugins(): AdapterPlugin[];
  
  async createChannel(pluginId: string, config: ChannelConfig): Promise<CommunicationChannel>;
}
```

## Modular Package Structure

### Core Package Structure
```
@remote-comm/core/
├── src/
│   ├── interfaces/
│   │   ├── channel.ts           # Core channel interfaces
│   │   ├── message.ts           # Message type definitions
│   │   ├── plugin.ts            # Plugin system interfaces
│   │   └── integration.ts       # Host app integration interfaces
│   ├── core/
│   │   ├── orchestrator.ts      # Main communication orchestrator
│   │   ├── messageRouter.ts     # Channel-agnostic message routing
│   │   ├── sessionManager.ts    # Session state management
│   │   └── pluginManager.ts     # Plugin loading and management
│   ├── utils/
│   │   ├── messageFormatter.ts  # Generic message formatting
│   │   ├── contextBuilder.ts    # Message context creation
│   │   └── validation.ts        # Configuration validation
│   └── index.ts                 # Public API exports
├── package.json
├── README.md
└── docs/
    ├── integration-guide.md
    ├── plugin-development.md
    └── api-reference.md
```

### Adapter Packages
```
@remote-comm/telegram-adapter/
├── src/
│   ├── telegramAdapter.ts       # Main adapter implementation
│   ├── telegramBot.ts           # Telegram Bot API wrapper
│   ├── webhookHandler.ts        # Webhook message handling
│   ├── voiceService.ts          # TTS integration
│   └── messageFormatter.ts     # Telegram-specific formatting
├── package.json
├── README.md
└── config/
    └── schema.json              # Configuration schema

@remote-comm/slack-adapter/
├── src/
│   ├── slackAdapter.ts          # Main adapter implementation
│   ├── slackBot.ts              # Slack Bot API wrapper
│   ├── eventHandler.ts          # Slack event handling
│   └── messageFormatter.ts     # Slack-specific formatting
├── package.json
└── README.md
```

### Integration Package for Host Applications
```
@remote-comm/ccmanager-integration/
├── src/
│   ├── ccmanagerIntegration.ts  # CCManager-specific integration
│   ├── sessionHooks.ts          # PTY output capture
│   ├── uiComponents.ts          # React components for configuration
│   └── configManager.ts        # CCManager config integration
├── package.json
└── README.md
```

## Configuration System

### 1. Hierarchical Configuration

```typescript
interface CommunicationConfig {
  // Global settings
  global: GlobalConfig;
  
  // Per-workspace settings
  workspaces: Map<string, WorkspaceConfig>;
  
  // Channel configurations
  channels: Map<string, ChannelConfig>;
  
  // Plugin settings
  plugins: Map<string, PluginConfig>;
}

interface GlobalConfig {
  enabled: boolean;
  defaultChannel: string;
  defaultMessageType: MessageType;
  messageContext: MessageContextConfig;
  retryPolicy: RetryPolicy;
  rateLimiting: RateLimitConfig;
}

interface WorkspaceConfig {
  enabled: boolean;
  channelOverride?: string;
  messageTypeOverride?: MessageType;
  contextOverrides: Partial<MessageContext>;
  filters: MessageFilter[];
}

interface ChannelConfig {
  pluginId: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  features: FeatureConfig[];
}
```

### 2. Configuration Validation and Schema

```typescript
interface ConfigSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, ConfigSchema>;
  required?: string[];
  validation?: ValidationRule[];
  default?: any;
  description?: string;
  examples?: any[];
}

interface ValidationRule {
  type: 'regex' | 'range' | 'enum' | 'custom';
  value: any;
  message: string;
}
```

## Integration Points for Host Applications

### 1. Minimal Integration (Basic Support)

```typescript
// Host application only needs to implement this interface
class MinimalIntegration implements HostApplicationIntegration {
  onSessionOutput(handler: (sessionId: string, output: string) => void): void {
    // Hook into your application's output capture
    this.sessionManager.on('output', (sessionId, output) => {
      handler(sessionId, output);
    });
  }
  
  async sendSessionInput(sessionId: string, input: string): Promise<void> {
    // Forward input to your session
    await this.sessionManager.sendInput(sessionId, input);
  }
  
  getWorkspaceInfo(sessionId: string): WorkspaceInfo {
    // Return workspace information
    return this.workspaceManager.getInfo(sessionId);
  }
  
  getSessionInfo(sessionId: string): SessionInfo {
    // Return session information
    return this.sessionManager.getInfo(sessionId);
  }
}

// Initialize remote communication
const remoteCommunication = new RemoteCommunicationOrchestrator();
await remoteCommunication.initialize(new MinimalIntegration());
```

### 2. Rich Integration (Full UI Support)

```typescript
class RichIntegration extends MinimalIntegration {
  showNotification(message: string, type: NotificationType): void {
    // Show notification in your UI
    this.notificationService.show(message, type);
  }
  
  updateStatusIndicator(sessionId: string, status: CommunicationStatus): void {
    // Update UI status indicators
    this.uiManager.updateSessionStatus(sessionId, status);
  }
}
```

### 3. Plugin-based Integration

```typescript
// Host applications can also be plugins themselves
interface HostApplicationPlugin {
  integrate(orchestrator: RemoteCommunicationOrchestrator): Promise<void>;
  getUIComponents?(): UIComponent[];
  getConfigurationPages?(): ConfigPage[];
}
```

## Benefits of This Architecture

### 1. **Extensibility**
- New communication channels can be added as separate plugins
- No core system changes required for new adapters
- Independent development and versioning of adapters

### 2. **Reusability**
- Core system can be integrated into any terminal/CLI tool
- Adapters work across different host applications
- Shared configuration and message formatting

### 3. **Maintainability**
- Clear separation of concerns
- Isolated testing of individual components
- Minimal coupling between adapters

### 4. **Flexibility**
- Host applications choose their level of integration
- Adapters can be enabled/disabled independently
- Runtime plugin loading and unloading

### 5. **Scalability**
- Plugin system supports unlimited communication channels
- Horizontal scaling through multiple adapter instances
- Load balancing across different channels

## Example Integration Scenarios

### 1. CCManager Integration
```typescript
import { RemoteCommunicationOrchestrator } from '@remote-comm/core';
import { CCManagerIntegration } from '@remote-comm/ccmanager-integration';
import { TelegramAdapter } from '@remote-comm/telegram-adapter';

const integration = new CCManagerIntegration(sessionManager, workspaceManager);
const orchestrator = new RemoteCommunicationOrchestrator();

await orchestrator.initialize(integration);
await orchestrator.loadPlugin('@remote-comm/telegram-adapter');
await orchestrator.createChannel('telegram', telegramConfig);
```

### 2. Vim Plugin Integration
```typescript
import { RemoteCommunicationOrchestrator } from '@remote-comm/core';

class VimIntegration implements HostApplicationIntegration {
  // Implement integration for Vim
  onSessionOutput(handler) {
    // Hook into Vim's output
  }
  
  getWorkspaceInfo(sessionId) {
    // Return current buffer/project info
  }
}

const orchestrator = new RemoteCommunicationOrchestrator();
await orchestrator.initialize(new VimIntegration());
```

### 3. VS Code Extension Integration
```typescript
import { RemoteCommunicationOrchestrator } from '@remote-comm/core';
import * as vscode from 'vscode';

class VSCodeIntegration implements HostApplicationIntegration {
  // Implement integration for VS Code terminals
}
```

This modular architecture ensures that the remote communication feature can be easily adopted by other open source projects while maintaining clean boundaries and minimal coupling between components.