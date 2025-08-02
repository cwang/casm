# Testing Strategy

## Test Categories

### Unit Tests

#### 1. Remote Communication Manager Tests
**File**: `src/services/__tests__/remoteCommunicationManager.test.ts`

```typescript
describe('RemoteCommunicationManager', () => {
  let manager: RemoteCommunicationManager;
  let mockTelegramService: jest.Mocked<TelegramService>;
  let mockVoiceSynthesis: jest.Mocked<VoiceSynthesisService>;

  beforeEach(() => {
    mockTelegramService = createMockTelegramService();
    mockVoiceSynthesis = createMockVoiceSynthesis();
    manager = new RemoteCommunicationManager(mockTelegramService, mockVoiceSynthesis);
  });

  describe('enableCommunication', () => {
    it('should enable communication for a worktree', async () => {
      const config = createTestConfig();
      await manager.enableCommunication('/test/worktree', config);
      
      expect(manager.isEnabled('/test/worktree')).toBe(true);
    });

    it('should validate configuration before enabling', async () => {
      const invalidConfig = { ...createTestConfig(), channelId: '' };
      
      await expect(manager.enableCommunication('/test/worktree', invalidConfig))
        .rejects.toThrow('Invalid configuration');
    });
  });

  describe('processOutput', () => {
    it('should format message with worktree context', async () => {
      const config = createTestConfig();
      await manager.enableCommunication('/test/worktree', config);
      
      await manager.processOutput('/test/worktree', 'Hello from Claude');
      
      expect(mockTelegramService.sendTextMessage).toHaveBeenCalledWith(
        'test-chat',
        '[TestRepo/main] Hello from Claude'
      );
    });

    it('should send voice message when configured', async () => {
      const config = { ...createTestConfig(), messageType: 'voice' as MessageType };
      await manager.enableCommunication('/test/worktree', config);
      
      await manager.processOutput('/test/worktree', 'Hello from Claude');
      
      expect(mockVoiceSynthesis.synthesize).toHaveBeenCalledWith(
        '[TestRepo/main] Hello from Claude',
        expect.any(Object)
      );
    });
  });

  describe('handleIncomingMessage', () => {
    it('should route message to correct worktree session', async () => {
      const mockSessionManager = createMockSessionManager();
      manager.setSessionManager('/test/worktree', mockSessionManager);
      
      const message: IncomingMessage = {
        channelId: 'telegram',
        chatId: 'test-chat',
        userId: 'test-user',
        text: 'List files',
        timestamp: new Date()
      };
      
      await manager.handleIncomingMessage(message);
      
      expect(mockSessionManager.sendInput).toHaveBeenCalledWith('List files');
    });

    it('should handle message when no active session found', async () => {
      const message: IncomingMessage = {
        channelId: 'telegram',
        chatId: 'unknown-chat',
        userId: 'test-user',
        text: 'List files',
        timestamp: new Date()
      };
      
      await manager.handleIncomingMessage(message);
      
      expect(mockTelegramService.sendTextMessage).toHaveBeenCalledWith(
        'unknown-chat',
        expect.stringContaining('No active session found')
      );
    });
  });
});
```

#### 2. Telegram Service Tests
**File**: `src/services/telegram/__tests__/telegramService.test.ts`

```typescript
describe('TelegramService', () => {
  let service: TelegramService;
  let mockBot: jest.Mocked<Telegraf>;

  beforeEach(() => {
    mockBot = createMockTelegraf();
    service = new TelegramService(mockBot);
  });

  describe('sendTextMessage', () => {
    it('should send formatted text message', async () => {
      await service.sendTextMessage('test-chat', 'Hello World');
      
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        'test-chat',
        'Hello World',
        { parse_mode: 'Markdown' }
      );
    });

    it('should handle API errors gracefully', async () => {
      mockBot.telegram.sendMessage.mockRejectedValue(new Error('API Error'));
      
      await expect(service.sendTextMessage('test-chat', 'Hello'))
        .rejects.toThrow('Failed to send message: API Error');
    });
  });

  describe('sendVoiceMessage', () => {
    it('should send voice message with caption', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      
      await service.sendVoiceMessage('test-chat', audioBuffer, 'Voice caption');
      
      expect(mockBot.telegram.sendVoice).toHaveBeenCalledWith(
        'test-chat',
        { source: audioBuffer },
        { caption: 'Voice caption' }
      );
    });
  });

  describe('authenticate', () => {
    it('should validate bot token', async () => {
      mockBot.telegram.getMe.mockResolvedValue({ id: 123, username: 'testbot' } as any);
      
      const result = await service.authenticate('valid-token');
      
      expect(result).toBe(true);
      expect(mockBot.telegram.getMe).toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockBot.telegram.getMe.mockRejectedValue(new Error('Invalid token'));
      
      const result = await service.authenticate('invalid-token');
      
      expect(result).toBe(false);
    });
  });
});
```

#### 3. Voice Synthesis Tests
**File**: `src/services/__tests__/voiceSynthesis.test.ts`

```typescript
describe('VoiceSynthesisService', () => {
  let service: VoiceSynthesisService;
  let mockTTSClient: jest.Mocked<TextToSpeechClient>;

  beforeEach(() => {
    mockTTSClient = createMockTTSClient();
    service = new VoiceSynthesisService(mockTTSClient);
  });

  describe('synthesize', () => {
    it('should convert text to audio buffer', async () => {
      const mockAudioContent = Buffer.from('fake-audio-data');
      mockTTSClient.synthesizeSpeech.mockResolvedValue([{
        audioContent: mockAudioContent
      }] as any);

      const result = await service.synthesize('Hello World', {
        languageCode: 'en-US',
        name: 'en-US-Neural2-C',
        ssmlGender: 'FEMALE'
      });

      expect(result).toEqual(mockAudioContent);
    });

    it('should use caching for repeated requests', async () => {
      const mockAudioContent = Buffer.from('fake-audio-data');
      mockTTSClient.synthesizeSpeech.mockResolvedValue([{
        audioContent: mockAudioContent
      }] as any);

      // First call
      await service.synthesize('Hello World', { languageCode: 'en-US' });
      // Second call with same parameters
      await service.synthesize('Hello World', { languageCode: 'en-US' });

      expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });

    it('should handle TTS API errors', async () => {
      mockTTSClient.synthesizeSpeech.mockRejectedValue(new Error('TTS API Error'));

      await expect(service.synthesize('Hello World', { languageCode: 'en-US' }))
        .rejects.toThrow('Failed to synthesize speech: TTS API Error');
    });
  });
});
```

### Integration Tests

#### 1. End-to-End Communication Flow
**File**: `src/__tests__/integration/communicationFlow.test.ts`

```typescript
describe('Communication Flow Integration', () => {
  let app: TestApplication;
  let mockTelegramBot: MockTelegramBot;
  let testWorktree: TestWorktree;

  beforeEach(async () => {
    app = await createTestApplication();
    mockTelegramBot = new MockTelegramBot();
    testWorktree = await createTestWorktree();
  });

  afterEach(async () => {
    await app.cleanup();
    await testWorktree.cleanup();
  });

  it('should send Claude responses to Telegram', async () => {
    // Enable communication for test worktree
    await app.remoteCommunicationManager.enableCommunication(
      testWorktree.path,
      {
        channelId: 'telegram',
        messageType: 'text',
        credentials: { chatId: 'test-chat' }
      }
    );

    // Start Claude session
    const session = await app.sessionManager.createSession(testWorktree.path);
    
    // Simulate Claude output
    session.simulateOutput('Hello! I\'m ready to help.');

    // Verify message was sent to Telegram
    await waitFor(() => {
      expect(mockTelegramBot.sentMessages).toHaveLength(1);
      expect(mockTelegramBot.sentMessages[0]).toMatchObject({
        chatId: 'test-chat',
        text: expect.stringContaining('[TestRepo/main] Hello! I\'m ready to help.')
      });
    });
  });

  it('should route incoming Telegram messages to correct session', async () => {
    // Setup communication
    await app.remoteCommunicationManager.enableCommunication(
      testWorktree.path,
      { channelId: 'telegram', messageType: 'text', credentials: { chatId: 'test-chat' } }
    );

    const session = await app.sessionManager.createSession(testWorktree.path);
    const inputSpy = jest.spyOn(session, 'sendInput');

    // Simulate incoming Telegram message
    await mockTelegramBot.receiveMessage({
      chatId: 'test-chat',
      text: 'ls -la',
      userId: 'test-user'
    });

    // Verify message was forwarded to session
    expect(inputSpy).toHaveBeenCalledWith('ls -la');
  });

  it('should handle voice messages end-to-end', async () => {
    // Enable voice communication
    await app.remoteCommunicationManager.enableCommunication(
      testWorktree.path,
      {
        channelId: 'telegram',
        messageType: 'voice',
        credentials: { chatId: 'test-chat' }
      }
    );

    const session = await app.sessionManager.createSession(testWorktree.path);
    
    // Simulate Claude output
    session.simulateOutput('Creating new file...');

    // Verify voice message was sent
    await waitFor(() => {
      expect(mockTelegramBot.sentVoiceMessages).toHaveLength(1);
      expect(mockTelegramBot.sentVoiceMessages[0]).toMatchObject({
        chatId: 'test-chat',
        caption: expect.stringContaining('[TestRepo/main]')
      });
    });
  });
});
```

#### 2. Session Manager Integration
**File**: `src/__tests__/integration/sessionIntegration.test.ts`

```typescript
describe('Session Manager Integration', () => {
  let sessionManager: SessionManager;
  let communicationManager: RemoteCommunicationManager;
  let mockTelegramService: MockTelegramService;

  beforeEach(async () => {
    mockTelegramService = new MockTelegramService();
    communicationManager = new RemoteCommunicationManager(mockTelegramService);
    sessionManager = new SessionManager();
    sessionManager.setCommunicationManager(communicationManager);
  });

  it('should capture PTY output and forward to communication manager', async () => {
    const worktreePath = '/test/worktree';
    
    // Enable communication
    await communicationManager.enableCommunication(worktreePath, {
      channelId: 'telegram',
      messageType: 'text',
      credentials: { chatId: 'test-chat' }
    });

    // Create session with mock PTY
    const session = await sessionManager.createSession(worktreePath, {
      command: './mock-claude',
      args: []
    });

    // Simulate PTY output
    session.mockPty.emit('data', 'Claude: How can I help you today?');

    // Verify communication manager processed the output
    await waitFor(() => {
      expect(mockTelegramService.sentMessages).toHaveLength(1);
    });
  });

  it('should forward incoming communication to PTY', async () => {
    const worktreePath = '/test/worktree';
    const session = await sessionManager.createSession(worktreePath);
    
    const writeSpy = jest.spyOn(session.pty, 'write');

    // Simulate incoming message
    await communicationManager.handleIncomingMessage({
      channelId: 'telegram',
      chatId: 'test-chat',
      userId: 'test-user',
      text: 'help me debug this code',
      timestamp: new Date()
    });

    expect(writeSpy).toHaveBeenCalledWith('help me debug this code\r');
  });
});
```

### UI Testing

#### 1. Component Tests
**File**: `src/components/__tests__/CommunicationConfig.test.tsx`

```typescript
describe('CommunicationConfig', () => {
  it('should render configuration form', () => {
    const { getByText, getByDisplayValue } = render(
      <CommunicationConfig
        config={defaultConfig}
        onConfigChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Remote Communication Configuration')).toBeInTheDocument();
    expect(getByDisplayValue('Telegram')).toBeInTheDocument();
    expect(getByDisplayValue('Text')).toBeInTheDocument();
  });

  it('should handle configuration changes', () => {
    const mockOnConfigChange = jest.fn();
    
    const { getByTestId } = render(
      <CommunicationConfig
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // Simulate changing message type
    fireEvent.change(getByTestId('message-type-select'), {
      target: { value: 'voice' }
    });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      messageType: 'voice'
    });
  });

  it('should validate required fields before saving', () => {
    const mockOnSave = jest.fn();
    
    const { getByText } = render(
      <CommunicationConfig
        config={{ ...defaultConfig, credentials: { chatId: '' } }}
        onConfigChange={jest.fn()}
        onSave={mockOnSave}
        onCancel={jest.fn()}
      />
    );

    fireEvent.click(getByText('Save'));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(getByText('Chat ID is required')).toBeInTheDocument();
  });
});
```

#### 2. Menu Integration Tests
**File**: `src/components/__tests__/Menu.integration.test.tsx`

```typescript
describe('Menu Integration', () => {
  it('should show communication status indicators', () => {
    const worktrees = [
      { path: '/test/worktree1', hasCommunication: true },
      { path: '/test/worktree2', hasCommunication: false }
    ];

    const { getByText } = render(
      <Menu worktrees={worktrees} onSelect={jest.fn()} />
    );

    expect(getByText('📱')).toBeInTheDocument(); // Communication enabled
    expect(getByText('📴')).toBeInTheDocument(); // Communication disabled
  });

  it('should handle communication toggle shortcut', () => {
    const mockOnToggleCommunication = jest.fn();
    
    const { container } = render(
      <Menu
        worktrees={[{ path: '/test/worktree' }]}
        onToggleCommunication={mockOnToggleCommunication}
      />
    );

    // Simulate pressing 'T' key
    fireEvent.keyPress(container, { key: 't', code: 'KeyT' });

    expect(mockOnToggleCommunication).toHaveBeenCalledWith('/test/worktree');
  });
});
```

### Manual Testing Scenarios

#### 1. User Acceptance Testing
**Test Plan**: `docs/testing/uat-plan.md`

##### Scenario 1: First-time Setup
1. User opens CCManager
2. Navigates to communication configuration
3. Sets up Telegram bot token
4. Configures default chat and message type
5. Tests connection successfully
6. Enables communication for a worktree
7. Starts Claude session and verifies messages are sent

##### Scenario 2: Voice Message Flow
1. User configures voice message type
2. Selects preferred voice and settings
3. Enables communication for worktree
4. Starts Claude session
5. Verifies voice messages are generated and sent
6. Checks audio quality and context labeling

##### Scenario 3: Bidirectional Communication
1. User sends message from Telegram
2. Verifies message appears in Claude session
3. Claude responds
4. Verifies response is sent back to Telegram
5. Continues conversation flow

##### Scenario 4: Multi-Worktree Management
1. User has multiple worktrees
2. Enables communication for some, not others
3. Verifies correct message routing
4. Tests context separation between sessions

#### 2. Performance Testing
**Test Plan**: `docs/testing/performance-plan.md`

##### Load Testing
- High-frequency message sending (100+ messages/minute)
- Large message content (near API limits)
- Multiple concurrent sessions
- Voice synthesis performance under load

##### Memory Testing
- Long-running sessions (8+ hours)
- Memory leak detection
- Cache size management
- PTY buffer handling

#### 3. Error Scenario Testing
**Test Plan**: `docs/testing/error-scenarios.md`

##### Network Failures
- Telegram API downtime
- Intermittent connectivity
- Rate limiting responses
- Invalid webhook URLs

##### Configuration Errors
- Invalid bot tokens
- Missing permissions
- Incorrect chat IDs
- TTS service failures

##### Session Errors
- PTY crashes
- Claude Code errors
- Worktree deletion during active session
- Concurrent access issues

## Test Data and Fixtures

### Mock Services
**File**: `src/__tests__/mocks/telegramService.ts`

```typescript
export class MockTelegramService implements CommunicationChannel {
  public sentMessages: Array<{ chatId: string; text: string }> = [];
  public sentVoiceMessages: Array<{ chatId: string; audio: Buffer; caption: string }> = [];

  async sendMessage(chatId: string, message: string, type: MessageType): Promise<void> {
    if (type === 'voice') {
      this.sentVoiceMessages.push({
        chatId,
        audio: Buffer.from('mock-audio'),
        caption: message
      });
    } else {
      this.sentMessages.push({ chatId, text: message });
    }
  }

  async authenticate(token: string): Promise<boolean> {
    return token === 'valid-token';
  }

  onMessage(callback: (message: IncomingMessage) => void): void {
    this.messageCallback = callback;
  }

  // Test helper methods
  simulateIncomingMessage(message: Partial<IncomingMessage>): void {
    if (this.messageCallback) {
      this.messageCallback({
        channelId: 'telegram',
        chatId: 'test-chat',
        userId: 'test-user',
        text: 'test message',
        timestamp: new Date(),
        ...message
      });
    }
  }
}
```

### Test Configuration
**File**: `src/__tests__/fixtures/testConfig.ts`

```typescript
export const createTestConfig = (): CommunicationConfig => ({
  channelId: 'telegram',
  messageType: 'text',
  credentials: {
    botToken: 'test-token',
    chatId: 'test-chat'
  },
  worktreeContext: {
    repoName: 'TestRepo',
    worktreePath: '/test/worktree',
    branchName: 'main'
  }
});

export const createTestWorktree = (): Worktree => ({
  path: '/test/worktree',
  branch: 'main',
  isMain: false,
  ahead: 0,
  behind: 0,
  hasChanges: false
});
```

## Continuous Integration

### GitHub Actions Workflow
**File**: `.github/workflows/communication-tests.yml`

```yaml
name: Communication Feature Tests

on:
  push:
    paths:
      - 'src/services/remote*'
      - 'src/services/telegram/**'
      - 'src/components/*Communication*'
  pull_request:
    paths:
      - 'src/services/remote*'
      - 'src/services/telegram/**'
      - 'src/components/*Communication*'

jobs:
  test-communication:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test -- --testPathPattern="communication|telegram"
      
      - name: Run integration tests
        run: npm run test:integration -- --testPathPattern="communication"
      
      - name: Test build with communication features
        run: npm run build
```

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage for core communication logic
- **Integration Tests**: 80%+ coverage for end-to-end flows
- **UI Tests**: 70%+ coverage for communication-related components
- **Manual Tests**: 100% coverage of user acceptance scenarios