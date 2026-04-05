# Claude Session Manager

Manage multiple Claude Code sessions with ease.

## CLI (`cs`)

### Install

```bash
cd claude-session-manager
npm install
npm link
```

### Usage

```bash
# List running sessions
cs list

# List all history sessions
cs list --all

# Switch to a session
cs switch <session-id>

# Open new session
cs switch new

# Add tags
cs tag <session-id> work project-name

# List tags
cs tags

# Filter by tag
cs list --tag work
```

### Options

- `--json` - Output as JSON for programmatic use
- `--tag <tag>` - Filter sessions by tag
- `--project <path>` - Filter sessions by project
- `--all` - List all history sessions

## Menu Bar App (macOS)

A native macOS menu bar app for quick session switching.

### Build

```bash
cd claude-session-bar
xcodegen generate
xcodebuild -project ClaudeSessionBar.xcodeproj -scheme ClaudeSessionBar -configuration Debug build
```

### Run

Open the built app:
```
~/Library/Developer/Xcode/DerivedData/ClaudeSessionBar-*/Build/Products/Debug/ClaudeSessionBar.app
```

The app appears in your menu bar with a message icon. Click to see running sessions.

## How It Works

- Sessions are stored in `~/.claude/sessions/`
- Session history is in `~/.claude/history.jsonl`
- Session messages are in `~/.claude/projects/{project}/{sessionId}.jsonl`
- Tags are persisted in `~/.claude/sessions/tags.json`

## License

MIT
