# Autopilot API Key Setup Guide

## Overview

CCManager's Autopilot feature requires LLM API keys to function. This guide explains how to set up and manage these keys securely.

## Why Environment Variables?

CCManager uses environment variables for API key storage, which is the recommended approach for several reasons:

### Security Benefits ✅
- **No plaintext storage**: Keys are not saved in configuration files
- **Accidental exposure prevention**: Config files can be safely shared without revealing keys
- **Industry standard**: Follows 12-factor app methodology for credential management
- **Isolation**: Keys don't appear in CCManager config backups or exports

### Development Best Practices ✅
- **Aligns with Claude Code**: Follows the same pattern as the tools you're already using
- **Cross-tool compatibility**: Same keys work with other LLM tools
- **Process isolation**: Keys are available to the application at runtime only

## Alternative: Config File Storage (Not Recommended)

While we could store API keys in CCManager's config file (`~/.config/ccmanager/config.json`), this approach has significant drawbacks:

### Security Risks ❌
- **Plaintext exposure**: Keys stored in readable text files
- **Accidental sharing**: Config files might be shared or committed to version control
- **File permissions**: Requires careful management of file permissions
- **Backup exposure**: Keys included in any config backups

### Implementation Complexity ❌
- **Encryption overhead**: Would need to implement secure key encryption/decryption
- **Key rotation**: More complex to update keys when they expire
- **Platform differences**: Different security models across operating systems

## Recommended Setup: Environment Variables

### 1. Setting Keys Temporarily

For immediate testing:

```bash
# Set for current session only
export OPENAI_API_KEY="your-openai-key-here"
export ANTHROPIC_API_KEY="your-anthropic-key-here"

# Verify keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

### 2. Making Keys Persistent

For permanent setup, add to your shell configuration:

```bash
# For Bash users (~/.bashrc or ~/.bash_profile)
echo 'export OPENAI_API_KEY="your-openai-key-here"' >> ~/.bashrc
echo 'export ANTHROPIC_API_KEY="your-anthropic-key-here"' >> ~/.bashrc

# For Zsh users (~/.zshrc)
echo 'export OPENAI_API_KEY="your-openai-key-here"' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="your-anthropic-key-here"' >> ~/.zshrc

# For Fish users (~/.config/fish/config.fish)
echo 'set -gx OPENAI_API_KEY "your-openai-key-here"' >> ~/.config/fish/config.fish
echo 'set -gx ANTHROPIC_API_KEY "your-anthropic-key-here"' >> ~/.config/fish/config.fish

# Reload your shell configuration
source ~/.bashrc  # or ~/.zshrc, etc.
```

### 3. Obtaining API Keys

#### OpenAI API Key

1. **Visit**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Sign in** or create an account
3. **Click**: "Create new secret key"
4. **Name**: Give it a descriptive name (e.g., "CCManager Autopilot")
5. **Copy**: The generated key (you won't see it again)
6. **Set**: Export as `OPENAI_API_KEY` environment variable

**Available Models**: GPT-4.1, o4-mini, o3

#### Anthropic API Key

1. **Visit**: [console.anthropic.com](https://console.anthropic.com/)
2. **Sign in** or create an account
3. **Navigate**: To "API Keys" section
4. **Click**: "Create Key"
5. **Name**: Give it a descriptive name
6. **Copy**: The generated key
7. **Set**: Export as `ANTHROPIC_API_KEY` environment variable

**Available Models**: Claude 4 Sonnet, Claude 4 Opus

## How CCManager Uses the Keys

### Automatic Detection

CCManager automatically detects which API keys are available:

```typescript
// Runtime detection
LLMClient.hasAnyProviderKeys()           // Returns: true/false
LLMClient.getAvailableProviderKeys()     // Returns: ['openai', 'anthropic']
LLMClient.isProviderAvailable('openai') // Returns: true/false
```

### UI Behavior

- **No keys**: Autopilot shows as "DISABLED"
- **Some keys**: Only available providers appear in configuration
- **All keys**: Full provider choice available

### Error Handling

CCManager provides clear feedback when keys are missing:

- Configuration screen shows warnings for missing keys
- Provider selection filtered to available options only
- Clear error messages guide users to set up missing keys

## Security Best Practices

### Do ✅
- Store keys in environment variables
- Use descriptive names when creating keys on provider platforms
- Regularly rotate your API keys
- Monitor your API usage on provider dashboards
- Set up billing alerts to prevent unexpected charges

### Don't ❌
- Store keys in configuration files
- Commit keys to version control
- Share keys in plain text (email, chat, etc.)
- Use the same key across multiple applications in production
- Leave unused keys active

## Troubleshooting

### Keys Not Detected

```bash
# Check if keys are properly set
env | grep API_KEY

# Restart your terminal/shell
# CCManager reads environment variables at startup
```

### Provider Not Available

1. Verify the key is set correctly
2. Check the key hasn't expired on the provider platform
3. Ensure you have credits/quota available
4. Restart CCManager to re-read environment variables

### Testing Key Validity

CCManager will show connection errors in the UI if keys are invalid. You can also test directly:

```bash
# Test OpenAI key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Test Anthropic key  
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages
```

## Summary

Environment variables provide the best balance of security, usability, and industry standard practices for API key management in CCManager. While config file storage might seem more user-friendly, the security risks outweigh the convenience benefits for sensitive credentials like LLM API keys.