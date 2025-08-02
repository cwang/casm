# Package Structure and Integration Points

## Overview

This document defines the modular package structure for the remote communication system, showing how packages interact and how external projects can integrate with the system.

## Monorepo Structure

```
remote-communication/
├── packages/
│   ├── core/                           # @remote-comm/core
│   ├── adapters/
│   │   ├── telegram/                   # @remote-comm/telegram-adapter
│   │   ├── slack/                      # @remote-comm/slack-adapter
│   │   └── voice-synthesis/            # @remote-comm/voice-synthesis
│   ├── integrations/
│   │   ├── ccmanager/                  # @remote-comm/ccmanager-integration
│   │   └── ccmanager-ui/               # @remote-comm/ccmanager-ui
│   └── tools/
│       └── dev-utils/                  # @remote-comm/dev-utils
├── examples/
│   ├── vim-plugin/                     # Vim integration example
│   ├── vscode-extension/               # VS Code extension example
│   ├── generic-cli-tool/               # Minimal CLI tool example
│   └── custom-adapter/                 # Custom adapter example
├── docs/
│   ├── integration-guide.md
│   ├── plugin-development.md
│   ├── api-reference.md
│   └── examples/
├── tools/
│   ├── build-scripts/
│   └── testing-utils/
└── package.json                        # Root package.json for monorepo
```

## Package Dependencies

### Dependency Graph
```
┌─────────────────────────────────────────────────────────────────┐
│                     External Projects                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ CCManager   │  │ Vim Plugin  │  │ VS Code Extension       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Integration Packages                             │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐ │
│  │ @remote-comm/              │  │ @remote-comm/             │ │
│  │ ccmanager-integration      │  │ ccmanager-ui              │ │
│  └─────────────────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Package                               │
│                 @remote-comm/core                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Adapter Packages                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ @remote-comm/   │  │ @remote-comm/   │  │ @remote-comm/   │ │
│  │ telegram-adapter│  │ slack-adapter   │  │ voice-synthesis │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Package (@remote-comm/core)

### Package.json
```json
{
  "name": "@remote-comm/core",
  "version": "1.0.0",
  "description": "Core communication system for remote CLI/terminal interaction",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./interfaces": {
      "import": "./dist/interfaces/index.mjs",
      "require": "./dist/interfaces/index.js",
      "types": "./dist/interfaces/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "lint": "eslint src/**/*.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["communication", "cli", "terminal", "remote", "plugin"],
  "dependencies": {
    "eventemitter3": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0"
  },
  "peerDependencies": {},
  "files": ["dist/**/*", "README.md"],
  "repository": "https://github.com/your-org/remote-communication",
  "license": "MIT"
}
```

### Public API Exports
```typescript
// src/index.ts - Main public API
export { RemoteCommunicationOrchestrator } from './core/orchestrator';
export { PluginManager } from './core/pluginManager';
export { ConfigurationManager } from './core/configManager';

// Interfaces for implementers
export type {
  CommunicationChannel,
  AdapterPlugin,
  HostApplicationIntegration,
  OutgoingMessage,
  IncomingMessage,
  ChannelConfig,
  PluginManifest
} from './interfaces';

// Utilities for adapter development
export { MessageValidator } from './utils/validation';
export { ContextBuilder } from './utils/contextBuilder';
export { BaseAdapter } from './utils/baseAdapter';
```

### File Structure
```
packages/core/
├── src/
│   ├── interfaces/
│   │   ├── index.ts             # Re-export all interfaces
│   │   ├── channel.ts           # CommunicationChannel interface
│   │   ├── message.ts           # Message type definitions
│   │   ├── plugin.ts            # Plugin system interfaces
│   │   ├── integration.ts       # Host app integration interfaces
│   │   └── config.ts            # Configuration interfaces
│   ├── core/
│   │   ├── orchestrator.ts      # Main communication orchestrator
│   │   ├── pluginManager.ts     # Plugin loading and management
│   │   ├── channelFactory.ts    # Channel creation and lifecycle
│   │   ├── messageRouter.ts     # Channel-agnostic message routing
│   │   ├── sessionManager.ts    # Session state management
│   │   ├── configManager.ts     # Configuration management
│   │   └── hookManager.ts       # Host app hook management
│   ├── utils/
│   │   ├── baseAdapter.ts       # Base class for adapters
│   │   ├── messageFormatter.ts  # Generic message formatting
│   │   ├── contextBuilder.ts    # Message context creation
│   │   ├── validation.ts        # Configuration validation
│   │   ├── logger.ts            # Logging utilities
│   │   └── errors.ts            # Error definitions
│   ├── storage/
│   │   ├── configStorage.ts     # Configuration persistence
│   │   ├── credentialStorage.ts # Secure credential storage
│   │   └── cacheStorage.ts      # Message/state caching
│   └── index.ts                 # Main export file
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── api.md
│   └── architecture.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Adapter Packages

### Telegram Adapter (@remote-comm/telegram-adapter)

#### Package.json
```json
{
  "name": "@remote-comm/telegram-adapter",
  "version": "1.0.0",
  "description": "Telegram adapter for remote communication system",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["telegram", "communication", "adapter", "bot"],
  "dependencies": {
    "@remote-comm/core": "^1.0.0",
    "@remote-comm/voice-synthesis": "^1.0.0",
    "telegraf": "^4.15.2"
  },
  "peerDependencies": {
    "@remote-comm/core": "^1.0.0"
  }
}
```

#### Plugin Registration
```typescript
// src/index.ts
import { AdapterPlugin, PluginManifest } from '@remote-comm/core';
import { TelegramAdapter } from './telegramAdapter';

export const manifest: PluginManifest = {
  id: 'telegram',
  name: 'Telegram Adapter',
  version: '1.0.0',
  description: 'Send and receive messages via Telegram Bot API',
  author: 'Remote Communication Team',
  dependencies: [],
  permissions: ['network', 'webhook'],
  configSchema: require('./config/schema.json')
};

export class TelegramPlugin implements AdapterPlugin {
  readonly manifest = manifest;
  
  async initialize(context: PluginContext): Promise<void> {
    // Plugin initialization
  }
  
  async createChannel(config: ChannelConfig): Promise<CommunicationChannel> {
    return new TelegramAdapter(config);
  }
  
  // ... other plugin methods
}

// Default export for auto-discovery
export default TelegramPlugin;
```

### Voice Synthesis Package (@remote-comm/voice-synthesis)

#### Package.json
```json
{
  "name": "@remote-comm/voice-synthesis",
  "version": "1.0.0",
  "description": "Voice synthesis service for communication adapters",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["tts", "voice", "synthesis", "audio"],
  "dependencies": {
    "@google-cloud/text-to-speech": "^5.0.0",
    "node-ffmpeg": "^0.6.1"
  },
  "peerDependencies": {
    "@remote-comm/core": "^1.0.0"
  },
  "optionalDependencies": {
    "@azure/cognitiveservices-speech": "^1.0.0",
    "aws-sdk": "^2.0.0"
  }
}
```

#### Provider Interface
```typescript
// src/index.ts
export { VoiceSynthesizer } from './voiceSynthesizer';
export { AudioProcessor } from './audioProcessor';
export type { VoiceProvider, VoiceConfig, AudioFormat } from './interfaces';

// Providers
export { GoogleTTSProvider } from './providers/googleTTS';
export { AzureTTSProvider } from './providers/azureTTS';
export { AWSPollyProvider } from './providers/awsPolly';
```

## Integration Packages

### CCManager Integration (@remote-comm/ccmanager-integration)

#### Package.json
```json
{
  "name": "@remote-comm/ccmanager-integration",
  "version": "1.0.0",
  "description": "CCManager integration for remote communication system",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["ccmanager", "integration", "cli"],
  "dependencies": {
    "@remote-comm/core": "^1.0.0"
  },
  "peerDependencies": {
    "@remote-comm/core": "^1.0.0"
  }
}
```

#### Integration Implementation
```typescript
// src/index.ts
export { CCManagerIntegration } from './ccmanagerIntegration';
export { SessionHooks } from './sessionHooks';
export { WorkspaceMapper } from './workspaceMapper';
export { ConfigBridge } from './configBridge';

// Easy setup function
export async function setupCCManagerCommunication(
  sessionManager: any,
  workspaceManager: any,
  config?: Partial<CommunicationConfig>
): Promise<RemoteCommunicationOrchestrator> {
  const integration = new CCManagerIntegration(sessionManager, workspaceManager);
  const orchestrator = new RemoteCommunicationOrchestrator();
  
  await orchestrator.initialize(integration, config);
  return orchestrator;
}
```

### CCManager UI Components (@remote-comm/ccmanager-ui)

#### Package.json
```json
{
  "name": "@remote-comm/ccmanager-ui",
  "version": "1.0.0",
  "description": "React UI components for CCManager communication integration",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["ccmanager", "ui", "react", "ink"],
  "dependencies": {
    "@remote-comm/core": "^1.0.0",
    "@remote-comm/ccmanager-integration": "^1.0.0",
    "ink": "^4.0.0",
    "react": "^18.0.0"
  },
  "peerDependencies": {
    "ink": "^4.0.0",
    "react": "^18.0.0"
  }
}
```

## Integration Examples

### Minimal CLI Tool Integration

```typescript
// examples/generic-cli-tool/src/integration.ts
import { 
  RemoteCommunicationOrchestrator, 
  HostApplicationIntegration,
  WorkspaceInfo,
  SessionInfo
} from '@remote-comm/core';

class MinimalIntegration implements HostApplicationIntegration {
  constructor(private cliTool: any) {}
  
  onSessionOutput(handler: (sessionId: string, output: string) => void): void {
    this.cliTool.on('output', handler);
  }
  
  async sendSessionInput(sessionId: string, input: string): Promise<void> {
    await this.cliTool.sendInput(sessionId, input);
  }
  
  getWorkspaceInfo(sessionId: string): WorkspaceInfo {
    return {
      path: this.cliTool.getCurrentPath(),
      repositoryName: 'my-project',
      branchName: 'main',
      hasChanges: false,
      ahead: 0,
      behind: 0
    };
  }
  
  getSessionInfo(sessionId: string): SessionInfo {
    return this.cliTool.getSessionInfo(sessionId);
  }
}

// Usage
async function setupCommunication() {
  const integration = new MinimalIntegration(myCliTool);
  const orchestrator = new RemoteCommunicationOrchestrator();
  
  await orchestrator.initialize(integration);
  
  // Load Telegram adapter
  await orchestrator.loadPlugin('@remote-comm/telegram-adapter');
  
  // Create and configure channel
  await orchestrator.createChannel('telegram', {
    pluginId: 'telegram',
    credentials: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    },
    settings: {
      messageType: 'text'
    }
  });
  
  // Enable communication for current workspace
  await orchestrator.enableCommunication('default-workspace');
}
```

### Vim Plugin Integration

```vim
" examples/vim-plugin/plugin/remote-comm.vim
function! s:InitRemoteCommunication()
  if !exists('g:remote_comm_initialized')
    let g:remote_comm_initialized = 1
    
    " Call Node.js integration script
    call system('node ' . expand('<sfile>:p:h') . '/../src/vim-integration.js')
  endif
endfunction

command! RemoteCommEnable call s:InitRemoteCommunication()
command! RemoteCommDisable call s:DisableRemoteCommunication()
command! RemoteCommConfig call s:OpenRemoteCommConfig()

" Auto-initialize if configured
if get(g:, 'remote_comm_auto_init', 0)
  autocmd VimEnter * call s:InitRemoteCommunication()
endif
```

```typescript
// examples/vim-plugin/src/vim-integration.ts
import { RemoteCommunicationOrchestrator, HostApplicationIntegration } from '@remote-comm/core';

class VimIntegration implements HostApplicationIntegration {
  onSessionOutput(handler: (sessionId: string, output: string) => void): void {
    // Hook into Vim's command output
    // Implementation depends on how Vim plugin captures output
  }
  
  async sendSessionInput(sessionId: string, input: string): Promise<void> {
    // Send command to Vim
    // Implementation depends on Vim command execution
  }
  
  getWorkspaceInfo(sessionId: string) {
    return {
      path: process.cwd(),
      repositoryName: path.basename(process.cwd()),
      branchName: 'main', // Could parse from git
      hasChanges: false,
      ahead: 0,
      behind: 0
    };
  }
  
  getSessionInfo(sessionId: string) {
    return {
      id: sessionId,
      command: 'vim',
      state: 'idle',
      startTime: new Date(),
      lastActivity: new Date()
    };
  }
}
```

## Publishing and Distribution

### NPM Package Publishing

```json
// .github/workflows/publish.yml
name: Publish Packages
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build packages
        run: npm run build
      
      - name: Test packages
        run: npm test
      
      - name: Publish to NPM
        run: npm run publish:all
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Package Discovery

```typescript
// Auto-discovery for adapters
const availableAdapters = await discoverAdapters([
  '@remote-comm/telegram-adapter',
  '@remote-comm/slack-adapter',
  '@remote-comm/discord-adapter', // Future adapter
  '@remote-comm/email-adapter'    // Future adapter
]);
```

## Benefits of This Package Structure

1. **Modularity**: Each package has a single responsibility
2. **Reusability**: Packages can be used independently
3. **Maintainability**: Clear boundaries and dependencies
4. **Extensibility**: New adapters as separate packages
5. **Testability**: Each package can be tested in isolation
6. **Versioning**: Independent versioning for each component
7. **Distribution**: Easy NPM publishing and consumption
8. **Integration**: Clear integration points for any host application