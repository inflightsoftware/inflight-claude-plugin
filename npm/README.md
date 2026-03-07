# inflight-mcp

[Inflight](https://inflight.co) MCP server — share UI prototypes for review from any AI coding tool.

## Quick start

### Claude Code

```bash
claude mcp add --scope user inflight -- npx inflight-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## What it does

Once connected, ask Claude to "share my project to Inflight" and it will:

1. Read your branch changes
2. Upload to a cloud sandbox
3. Build a live prototype
4. Open a shareable Inflight link

## Requirements

- Node.js 18+
- An [Inflight](https://inflight.co) account
