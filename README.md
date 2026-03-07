# Inflight

Share UI prototypes for review, directly from your AI coding tool.

[Inflight](https://inflight.co) lets you share interactive prototypes of your UI changes with your team — no deploy pipeline needed.

## Install

### Claude Code (recommended)

```bash
claude mcp add --scope user inflight -- npx inflight-mcp
```

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "inflight": {
      "command": "npx",
      "args": ["inflight-mcp"]
    }
  }
}
```

### Any MCP client

```bash
npx inflight-mcp
```

This starts a standard stdio MCP server that works with any MCP-compatible client.

## Requirements

- Node.js 18+
- An Inflight account ([inflight.co](https://inflight.co))

## Usage

Once installed, just ask Claude to share your project:

> "Share my UI changes to Inflight"

Or use the slash commands:

- `/inflight:partial-share` — Share UI changes from your feature branch
- `/inflight:full-share` — Share the entire project
- `/inflight:manage` — Manage prototypes (list, delete)

## How it works

1. Reads your branch changes (git diff against main/master)
2. Uploads your code to a cloud sandbox
3. Builds a live prototype of your UI changes
4. Creates a shareable Inflight link and opens it in your browser

## Authentication

The first time you share, a browser window opens to sign in to Inflight. After that, your session is saved locally at `~/.claude/mcp-inflight-auth.json`.

## Troubleshooting

**Can't sign in?** Run `inflight_logout` (or `/inflight logout`) to clear your session, then try again.

**Update the plugin:**

```bash
claude plugin marketplace update inflight && claude plugin uninstall inflight && rm -rf ~/.claude/plugins/cache/inflight && claude plugin install inflight
```

Then restart Claude Code (new terminal).

## License

MIT
