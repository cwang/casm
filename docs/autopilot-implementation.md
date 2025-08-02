# Auto-pilot Implementation Documentation

## Overview

The Auto-pilot feature provides intelligent LLM-based monitoring and guidance for Claude Code sessions in CCManager. It uses Vercel's AI SDK for unified LLM provider support and delivers contextual suggestions when Claude gets stuck or confused.

## Architecture

### Core Components

```typescript
// Auto-pilot monitoring and orchestration
AutopilotMonitor: Core monitoring class with enable/disable, LLM analysis
LLMClient: Vercel AI SDK wrapper with multi-provider support
AutopilotConfig: TypeScript configuration interface
AutopilotDecision: LLM analysis result structure
```

### LLM Provider System

The implementation uses **Vercel AI SDK** for superior LLM provider abstraction:

```typescript
// Supported providers
type SupportedProvider = 'openai' | 'anthropic';

// Provider configuration
const PROVIDERS: Record<SupportedProvider, ProviderInfo> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    createModel: (model: string) => openai(model),
    requiresKey: 'OPENAI_API_KEY',
  },
  anthropic: {
    name: 'Anthropic', 
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    createModel: (model: string) => anthropic(model),
    requiresKey: 'ANTHROPIC_API_KEY',
  },
};
```

### Key Advantages of Vercel AI SDK

1. **Unified Interface**: Single API for multiple providers
2. **Type Safety**: Full TypeScript support with proper typing
3. **Error Handling**: Built-in retry logic and error management
4. **Provider Abstraction**: Easy to add new providers
5. **Streaming Support**: Ready for future streaming implementations
6. **Standardized Models**: Consistent model interface across providers

## Implementation Details

### Auto-pilot Monitor

```typescript
export class AutopilotMonitor extends EventEmitter {
  private llmClient: LLMClient;
  private config: AutopilotConfig;
  private analysisTimer?: NodeJS.Timeout;

  constructor(config: AutopilotConfig) {
    super();
    this.config = config;
    this.llmClient = new LLMClient(config);
  }

  // Enable/disable monitoring with rate limiting
  enable(session: Session): void
  disable(session: Session): void
  toggle(session: Session): boolean

  // Configuration updates
  updateConfig(config: AutopilotConfig): void
}
```

### LLM Client with Provider Switching

```typescript
export class LLMClient {
  private config: AutopilotConfig;

  // Easy provider switching
  updateConfig(config: AutopilotConfig): void {
    this.config = config;
  }

  // Provider availability checking
  isAvailable(): boolean {
    const provider = PROVIDERS[this.config.provider];
    return Boolean(process.env[provider.requiresKey]);
  }

  // Unified analysis interface
  async analyzeClaudeOutput(output: string): Promise<AutopilotDecision> {
    const provider = PROVIDERS[this.config.provider];
    const model = provider.createModel(this.config.model);
    
    const {text} = await generateText({
      model,
      prompt: this.buildAnalysisPrompt(output),
      temperature: 0.3,
    });

    return JSON.parse(text) as AutopilotDecision;
  }
}
```

### Configuration Schema

```typescript
interface AutopilotConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic';  // Easy provider switching
  model: string;                     // Provider-specific model names
  maxGuidancesPerHour: number;       // Rate limiting
  analysisDelayMs: number;           // Analysis debouncing
}

// Default configuration
{
  enabled: false,
  provider: 'openai',
  model: 'gpt-4',
  maxGuidancesPerHour: 3,
  analysisDelayMs: 3000,
}
```

## Integration Points

### Session Component Integration

```typescript
// Session.tsx integration
const handleStdinData = (data: string) => {
  // Auto-pilot toggle with 'p' key
  if (data === 'p' && autopilotMonitorRef.current) {
    const monitor = autopilotMonitorRef.current;
    if (monitor.isLLMAvailable()) {
      const isActive = monitor.toggle(session);
      const status = isActive ? 'ACTIVE' : 'STANDBY';
      const message = `✈️ Auto-pilot: ${status}\n`;
      session.process.write(message);
    } else {
      const message = '✈️ Auto-pilot: API key required\n';
      session.process.write(message);
    }
    return;
  }
  
  // Normal input processing...
};
```

### Configuration Manager Integration

```typescript
// Configuration persistence and defaults
getAutopilotConfig(): AutopilotConfig {
  return this.config.autopilot || {
    enabled: false,
    provider: 'openai',
    model: 'gpt-4',
    maxGuidancesPerHour: 3,
    analysisDelayMs: 3000,
  };
}

setAutopilotConfig(autopilotConfig: AutopilotConfig): void {
  this.config.autopilot = autopilotConfig;
  this.saveConfig();
}
```

## Usage Examples

### Basic Usage

```bash
# Set up API keys (choose one or both)
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"

# Start CCManager
npx ccmanager

# In any session, press 'p' to toggle auto-pilot
# ✈️ Auto-pilot: ACTIVE
```

### Provider Switching

```typescript
// Runtime provider switching
const newConfig: AutopilotConfig = {
  enabled: true,
  provider: 'anthropic',  // Switch from OpenAI to Anthropic
  model: 'claude-3-5-sonnet-20241022',
  maxGuidancesPerHour: 5,
  analysisDelayMs: 2000,
};

autopilotMonitor.updateConfig(newConfig);
```

### Available Providers Check

```typescript
// Check which providers are available
const available = LLMClient.getAvailableProviders();
// Returns: [
//   { name: 'OpenAI', models: [...], available: true },
//   { name: 'Anthropic', models: [...], available: false }
// ]
```

## Benefits of Current Implementation

### 1. **Easy LLM Switching**
- Runtime provider switching without restart
- Automatic model validation per provider
- Clear error messages for unsupported configurations

### 2. **Robust Error Handling**
- Graceful degradation when APIs unavailable
- Clear error messages for debugging
- Rate limiting to prevent API abuse

### 3. **Extensible Architecture**
- Simple to add new providers via Vercel AI SDK
- Clean separation of concerns
- Event-driven architecture for UI updates

### 4. **Production Ready**
- Comprehensive test coverage (254 tests passing)
- TypeScript type safety throughout
- No performance impact on existing functionality

## Future Extensions

### Adding New Providers

```typescript
// Easy to add new providers via Vercel AI SDK
import {google} from '@ai-sdk/google';

const PROVIDERS = {
  // ... existing providers
  google: {
    name: 'Google',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    createModel: (model: string) => google(model),
    requiresKey: 'GOOGLE_API_KEY',
  },
};
```

### Enhanced Features

- **Streaming Analysis**: Real-time guidance delivery
- **Custom Prompts**: User-configurable analysis prompts
- **Learning System**: Adapt suggestions based on user feedback
- **Multi-Session Coordination**: Cross-session intelligence sharing

## Testing Strategy

### Comprehensive Test Coverage

- **Unit Tests**: All core components (LLMClient, AutopilotMonitor)
- **Integration Tests**: Session component integration
- **Provider Tests**: Multiple provider scenarios
- **Error Handling**: API failures, invalid configurations
- **Mock Strategy**: Vercel AI SDK mocked for reliable testing

### Test Results

```
Test Files  20 passed (20)
Tests       254 passed | 3 skipped (257)
```

## Conclusion

The auto-pilot implementation leverages Vercel AI SDK to provide a robust, extensible, and production-ready LLM monitoring system. The architecture supports easy provider switching, comprehensive error handling, and future enhancements while maintaining excellent test coverage and performance.