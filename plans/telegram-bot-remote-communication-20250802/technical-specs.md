# Technical Specifications

## API Integration

### Telegram Bot API

#### Authentication
```typescript
interface TelegramConfig {
  botToken: string;        // Bot token from @BotFather
  chatId: string;          // Target chat ID or username
  webhookUrl?: string;     // Webhook URL for incoming messages
  webhookSecret?: string;  // Secret for webhook validation
}
```

#### Message Sending
```typescript
// Text Message
POST https://api.telegram.org/bot{token}/sendMessage
{
  "chat_id": "@username",
  "text": "[MyProject/main] Claude response here...",
  "parse_mode": "Markdown"
}

// Voice Message
POST https://api.telegram.org/bot{token}/sendVoice
{
  "chat_id": "@username",
  "voice": <audio_file_buffer>,
  "caption": "[MyProject/main] Voice response"
}
```

#### Webhook Configuration
```typescript
// Set webhook
POST https://api.telegram.org/bot{token}/setWebhook
{
  "url": "https://your-domain.com/telegram-webhook",
  "secret_token": "your-secret-here"
}

// Incoming message format
interface TelegramWebhookMessage {
  update_id: number;
  message: {
    message_id: number;
    from: {
      id: number;
      username: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    voice?: {
      file_id: string;
      duration: number;
    };
  };
}
```

### Voice Synthesis Integration

#### OpenAI Text-to-Speech API
```typescript
interface OpenAITTSConfig {
  apiKey: string;          // OpenAI API key
  model: 'tts-1' | 'tts-1-hd';  // Model selection
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number;           // 0.25 to 4.0
  response_format: 'mp3' | 'opus' | 'aac' | 'flac';
}

// API request for TTS
POST https://api.openai.com/v1/audio/speech
{
  "model": "tts-1",
  "input": "[MyProject/main] Claude response text",
  "voice": "alloy",
  "response_format": "opus",  // Compatible with Telegram
  "speed": 1.0
}
```

#### OpenAI Speech-to-Text API
```typescript
interface OpenAISTTConfig {
  apiKey: string;          // OpenAI API key
  model: 'whisper-1';      // Whisper model
  language?: string;       // ISO-639-1 language code
  response_format: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

// API request for STT
POST https://api.openai.com/v1/audio/transcriptions
Content-Type: multipart/form-data
{
  "file": <audio_file>,
  "model": "whisper-1",
  "language": "en",
  "response_format": "json"
}
```

## Message Flow Architecture

### Outgoing Message Flow
```typescript
// 1. Session output capture
class SessionManager {
  private onPtyData(data: string): void {
    if (this.remoteCommunicationManager.isEnabled(this.worktreePath)) {
      this.remoteCommunicationManager.processOutput(this.worktreePath, data);
    }
  }
}

// 2. Message processing
class RemoteCommunicationManager {
  async processOutput(worktreePath: string, output: string): Promise<void> {
    const config = this.getConfig(worktreePath);
    const formattedMessage = this.formatMessage(worktreePath, output);
    
    await this.sendMessage(config, formattedMessage);
  }
  
  private formatMessage(worktreePath: string, output: string): string {
    const context = this.getWorktreeContext(worktreePath);
    return `[${context.repoName}/${context.branchName}] ${output}`;
  }
}

// 3. Channel-specific delivery
class TelegramService {
  async sendMessage(config: TelegramConfig, message: string, type: MessageType): Promise<void> {
    if (type === 'voice') {
      const audioBuffer = await this.voiceSynthesis.synthesize(message);
      await this.sendVoiceMessage(config.chatId, audioBuffer, message);
    } else {
      await this.sendTextMessage(config.chatId, message);
    }
  }
}
```

### Incoming Message Flow
```typescript
// 1. Webhook handler
class TelegramWebhookHandler {
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message) return;
    
    const incomingMessage: IncomingMessage = {
      channelId: 'telegram',
      chatId: message.chat.id.toString(),
      userId: message.from.id.toString(),
      text: message.text || await this.transcribeVoice(message.voice),
      timestamp: new Date(message.date * 1000)
    };
    
    await this.remoteCommunicationManager.handleIncomingMessage(incomingMessage);
  }
}

// 2. Message routing
class RemoteCommunicationManager {
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const worktreePath = await this.findTargetWorktree(message);
    if (!worktreePath) {
      await this.sendErrorMessage(message.chatId, "No active session found");
      return;
    }
    
    const sessionManager = this.getSessionManager(worktreePath);
    await sessionManager.sendInput(message.text);
  }
  
  private async findTargetWorktree(message: IncomingMessage): Promise<string | null> {
    // Logic to determine which worktree the message is intended for
    // Could be based on chat context, user preference, or explicit commands
  }
}
```

## State Management

### Communication State Schema
```typescript
interface CommunicationState {
  globalConfig: GlobalCommunicationConfig;
  worktreeConfigs: Map<string, WorktreeCommunicationConfig>;
  activeSessions: Map<string, ActiveCommunicationSession>;
}

interface GlobalCommunicationConfig {
  defaultChannel: 'telegram' | 'slack';
  defaultMessageType: 'text' | 'voice';
  telegramConfig: TelegramConfig;
  voiceConfig: VoiceConfig;
  messageContext: MessageContextConfig;
}

interface WorktreeCommunicationConfig {
  enabled: boolean;
  channel: 'telegram' | 'slack';
  messageType: 'text' | 'voice';
  overrides: Partial<GlobalCommunicationConfig>;
  lastActivity: Date;
}

interface ActiveCommunicationSession {
  worktreePath: string;
  channelId: string;
  startTime: Date;
  messageCount: number;
  lastMessage: Date;
  status: 'active' | 'idle' | 'error';
}
```

### Persistence Strategy
```typescript
class CommunicationStateManager {
  private configPath = path.join(os.homedir(), '.config', 'ccmanager', 'communication.json');
  
  async saveState(state: CommunicationState): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(state, null, 2));
  }
  
  async loadState(): Promise<CommunicationState> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return this.getDefaultState();
    }
  }
}
```

## Performance Optimizations

### Message Queuing
```typescript
class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private rateLimiter = new RateLimiter(30, 1000); // 30 messages per second
  
  async enqueue(message: QueuedMessage): Promise<void> {
    this.queue.push(message);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      await this.rateLimiter.wait();
      const message = this.queue.shift();
      try {
        await this.sendMessage(message);
      } catch (error) {
        await this.handleSendError(message, error);
      }
    }
    this.processing = false;
  }
}
```

### Voice Synthesis Caching
```typescript
class VoiceSynthesisCache {
  private cache = new Map<string, Buffer>();
  private maxCacheSize = 100; // Maximum cached audio files
  
  async synthesize(text: string, config: VoiceConfig): Promise<Buffer> {
    const cacheKey = this.getCacheKey(text, config);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const audioBuffer = await this.ttsService.synthesize(text, config);
    
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }
}
```

## Error Handling

### Network Error Recovery
```typescript
class NetworkErrorHandler {
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  
  async sendWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await this.sleep(delay);
      }
    }
    
    throw new CommunicationError(
      `Failed to ${context} after ${this.maxRetries} attempts: ${lastError.message}`,
      { originalError: lastError, context }
    );
  }
}
```

### Error Types and Handling
```typescript
class CommunicationError extends Error {
  constructor(
    message: string,
    public details: {
      originalError?: Error;
      context?: string;
      worktreePath?: string;
      recoverable?: boolean;
    }
  ) {
    super(message);
    this.name = 'CommunicationError';
  }
}

class ErrorNotificationService {
  async notifyUser(error: CommunicationError): Promise<void> {
    const notification = this.formatErrorMessage(error);
    
    // Show in UI
    this.uiNotificationService.show(notification);
    
    // Log for debugging
    this.logger.error('Communication error', {
      error: error.message,
      details: error.details
    });
    
    // Attempt to send error notification via alternative channel
    if (error.details.recoverable) {
      await this.sendFallbackNotification(notification);
    }
  }
}
```

## Security Considerations

### Token Security
```typescript
class CredentialManager {
  private keytar = require('keytar');
  
  async storeTelegramToken(token: string): Promise<void> {
    await this.keytar.setPassword('ccmanager', 'telegram-bot-token', token);
  }
  
  async getTelegramToken(): Promise<string | null> {
    return await this.keytar.getPassword('ccmanager', 'telegram-bot-token');
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### Input Validation
```typescript
class MessageValidator {
  validateIncomingMessage(message: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [] };
    
    // Length validation
    if (message.length > 4000) {
      result.errors.push('Message too long (max 4000 characters)');
      result.valid = false;
    }
    
    // Command injection prevention
    if (this.containsSuspiciousPatterns(message)) {
      result.errors.push('Message contains suspicious patterns');
      result.valid = false;
    }
    
    return result;
  }
  
  private containsSuspiciousPatterns(message: string): boolean {
    const suspiciousPatterns = [
      /rm\s+-rf/,
      /sudo\s+/,
      />\s*\/dev\/null/,
      /\$\(/,
      /`.*`/
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(message));
  }
}
```