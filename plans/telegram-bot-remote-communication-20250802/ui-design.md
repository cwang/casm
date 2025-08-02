# UI Design Specification

## Menu Integration

### Main Menu Enhancement
Add new menu option: "Configure Remote Communication"

```
┌─────────────────────────────────────────────┐
│                 CCManager                   │
├─────────────────────────────────────────────┤
│ ► main (*)                                  │
│   feature/auth-improvements                 │
│   hotfix/session-cleanup                    │
│                                             │
│ [R] Refresh worktrees                       │
│ [C] Create new worktree                     │
│ [S] Configure shortcuts                     │
│ [M] Configure remote communication          │ ← NEW
│ [Q] Quit                                    │
└─────────────────────────────────────────────┘
```

### Per-Worktree Remote Communication Toggle

#### Worktree List with Communication Status
```
┌─────────────────────────────────────────────┐
│                 CCManager                   │
├─────────────────────────────────────────────┤
│ ► main (*) [📱]                             │ ← Remote comm enabled
│   feature/auth-improvements                 │
│   hotfix/session-cleanup [📴]               │ ← Remote comm disabled
│                                             │
│ Status Legend:                              │
│ [📱] Remote communication active            │
│ [📴] Remote communication disabled          │
│ (*) Has uncommitted changes                 │
└─────────────────────────────────────────────┘
```

#### Keyboard Shortcuts for Remote Communication
- `[T]` - Toggle remote communication for selected worktree
- `[M]` - Configure remote communication settings

## Configuration Screens

### Global Communication Settings
```
┌─────────────────────────────────────────────┐
│           Remote Communication              │
│               Configuration                 │
├─────────────────────────────────────────────┤
│                                             │
│ Default Channel: [Telegram        ▼]       │
│ Default Message Type: [Text       ▼]       │
│                                             │
│ Telegram Configuration:                     │
│ Bot Token: [●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●] │
│ Chat ID: [@username or chat_id     ]        │
│                                             │
│ Voice Settings:                             │
│ Voice: [Neural - Sarah    ▼]                │
│ Speed: [Normal           ▼]                │
│ Pitch: [Normal           ▼]                │
│                                             │
│ Message Context:                            │
│ ☑ Include repository name                   │
│ ☑ Include worktree path                     │
│ ☑ Include timestamp                         │
│ ☑ Include session state                     │
│                                             │
│ [Test Connection] [Save] [Cancel]           │
└─────────────────────────────────────────────┘
```

### Per-Worktree Communication Setup
```
┌─────────────────────────────────────────────┐
│      Remote Communication Setup             │
│         worktree: main                      │
├─────────────────────────────────────────────┤
│                                             │
│ Enable remote communication                 │
│ ☑ Away-from-computer mode                   │
│                                             │
│ Channel: [Telegram        ▼]                │
│ Message Type: [Voice      ▼]                │
│                                             │
│ Override Global Settings:                   │
│ Chat ID: [Use global      ▼]                │
│ Voice: [Use global       ▼]                │
│                                             │
│ Context Label:                              │
│ [MyProject/main] (auto-generated)           │
│                                             │
│ Communication will start when enabled.      │
│ Claude Code responses will be sent to       │
│ your configured Telegram chat as voice      │
│ messages with the context label.            │
│                                             │
│ [Enable] [Cancel]                           │
└─────────────────────────────────────────────┘
```

## Session View Integration

### Session Header with Communication Status
```
┌─────────────────────────────────────────────┐
│ Session: main | State: Waiting | 📱→@user   │ ← Communication indicator
├─────────────────────────────────────────────┤
│ │ Welcome to Claude Code!                   │
│ │                                           │
│ │ I'm ready to help you with your          │
│ │ programming tasks. What would you like    │
│ │ to work on?                               │
│ │                                           │
│ │ Do you want to start by exploring the     │
│ │ codebase or working on something          │
│ │ specific?                                 │
│ │                                           │
│ │ _                                         │
└─────────────────────────────────────────────┘
```

### Communication Status Indicators
- `📱→@user` - Actively sending to Telegram user
- `📱→#channel` - Actively sending to Telegram channel
- `📴` - Remote communication disabled
- `⚠️📱` - Communication error state
- `🔄📱` - Attempting to reconnect

### Quick Toggle in Session View
Press `[T]` while in session to show quick toggle:

```
┌─────────────────────────────────────────────┐
│ │ Do you want to start by exploring the     │
│ │ codebase or working on something          │
│ │ specific?                                 │
│ │                                           │
│ ┌─────────────────────────────────────────┐ │
│ │ Remote Communication                    │ │
│ │ Currently: Enabled (Voice → @user)     │ │
│ │                                         │ │
│ │ [D] Disable                             │ │
│ │ [S] Change settings                     │ │
│ │ [ESC] Cancel                            │ │
│ └─────────────────────────────────────────┘ │
│ │ _                                         │
└─────────────────────────────────────────────┘
```

## Message Preview and Testing

### Test Message Screen
```
┌─────────────────────────────────────────────┐
│            Test Communication               │
├─────────────────────────────────────────────┤
│                                             │
│ Send test message to verify configuration:  │
│                                             │
│ Message: [Hello from CCManager!     ]       │
│ Type: [Voice             ▼]                │
│                                             │
│ Preview Context Label:                      │
│ [MyProject/main] Test Message               │
│                                             │
│ This will be sent to:                       │
│ Channel: Telegram                           │
│ Recipient: @username                        │
│ Format: Voice message                       │
│                                             │
│ [Send Test] [Back]                          │
│                                             │
│ Status: ✅ Test message sent successfully   │
└─────────────────────────────────────────────┘
```

## Error States and Feedback

### Connection Error Display
```
┌─────────────────────────────────────────────┐
│               Connection Error               │
├─────────────────────────────────────────────┤
│                                             │
│ ⚠️  Failed to connect to Telegram          │
│                                             │
│ Error: Invalid bot token                    │
│                                             │
│ Possible solutions:                         │
│ • Verify bot token is correct               │
│ • Check internet connection                 │
│ • Ensure bot is active                      │
│                                             │
│ Remote communication has been disabled      │
│ for this session.                           │
│                                             │
│ [Retry] [Reconfigure] [Continue Offline]    │
└─────────────────────────────────────────────┘
```

### Message Delivery Status
In session view, show delivery confirmations:
```
│ │ Processing your request...                │
│ │ ✅ Sent to Telegram (@user)               │ ← Delivery confirmation
│ │                                           │
```

## Keyboard Shortcuts

### Global Shortcuts
- `[M]` - Open remote communication configuration
- `[T]` - Toggle remote communication for current worktree

### Context-Specific Shortcuts
#### In Session View:
- `[T]` - Quick communication toggle
- `[Ctrl+M]` - Message delivery status
- `[Ctrl+T]` - Test communication

#### In Configuration:
- `[Tab]` - Navigate between fields
- `[Enter]` - Save configuration
- `[Esc]` - Cancel without saving
- `[Ctrl+T]` - Send test message