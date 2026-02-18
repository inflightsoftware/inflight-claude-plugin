# InFlight Claude Code Plugin

Share and collaborate on UI prototypes via [InFlight](https://inflight.co).

This plugin allows you to share UI changes from your feature branch as interactive prototypes for team review, directly from Claude Code.

## Installation

### Quick Install (Recommended)

Clone directly into your Claude plugins directory:

```bash
git clone https://github.com/InFlight-Software/inflight-claude-plugin.git ~/.claude/plugins/inflight
```

Then install dependencies:

```bash
cd ~/.claude/plugins/inflight/local-mcp && bun install
```

### Alternative: Symlink

If you want to develop the plugin or keep it elsewhere:

```bash
git clone https://github.com/InFlight-Software/inflight-claude-plugin.git ~/inflight-claude-plugin
ln -s ~/inflight-claude-plugin ~/.claude/plugins/inflight
cd ~/inflight-claude-plugin/local-mcp && bun install
```

## Requirements

- [Claude Code CLI](https://claude.ai/code)
- [Bun](https://bun.sh) runtime
- An InFlight account (sign up at [inflight.co](https://inflight.co))

## Usage

### /share

Share UI changes from your feature branch for review.

```
/share
```

This will:
1. Analyze your git diff (feature branch vs main/master)
2. Upload your code to a cloud sandbox
3. Run Claude analysis to create a minimal Vite prototype
4. Deploy the prototype with a shareable InFlight URL

### /full-share

Share the entire project (not just branch changes).

```
/full-share
```

### /inflight

Manage prototypes and authentication.

```
/inflight login     # Authenticate with InFlight
/inflight logout    # Clear authentication
/inflight list      # List your prototypes
/inflight delete    # Delete a prototype
```

## Authentication

The first time you use a share command, you'll be prompted to authenticate:

1. A browser window opens to InFlight
2. Sign in with your InFlight account
3. The plugin receives an API key automatically

Your API key is stored locally at `~/.claude/mcp-inflight-auth.json`.

## How It Works

1. **Git Analysis**: Reads your branch diff against main/master
2. **Cloud Sandbox**: Uploads files to a secure CodeSandbox environment
3. **Claude Analysis**: Runs Claude to create a minimal Vite prototype focusing on UI changes
4. **InFlight Deployment**: Creates a shareable InFlight version with the live prototype

## Skills & MCP Tools

The plugin provides these skills (slash commands):

| Skill | Description |
|-------|-------------|
| `/share` | Share branch changes as a prototype |
| `/full-share` | Share the entire project |
| `/inflight` | Manage prototypes and auth |

And these MCP tools (used internally by skills):

| Tool | Description |
|------|-------------|
| `share` | Analyze and deploy UI changes |
| `check_existing_versions` | Find prior shares for a git repo |
| `inflight_login` | Authenticate with InFlight |
| `inflight_logout` | Clear authentication |

## Troubleshooting

### "Bun not found"

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

### "Plugin not loading"

1. Ensure the plugin is in `~/.claude/plugins/inflight/`
2. Check that `plugin.json` exists at the root
3. Run `bun install` in the `local-mcp/` directory

### "Authentication failed"

1. Run `/inflight logout` to clear cached auth
2. Run `/inflight login` to re-authenticate
3. Ensure you have an InFlight account at [inflight.co](https://inflight.co)

## Local Development

For plugin development, you can point to local services:

Create `local-mcp/.env`:
```bash
INFLIGHT_URL=http://localhost:5173
SHARE_API_URL=http://localhost:3002
```

The `.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}` to find the local-mcp server, so it works regardless of where the plugin is installed.

## License

MIT
