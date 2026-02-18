---
name: full-share
description: Share a full local project to InFlight for feedback and collaboration. Use for sharing entire projects rather than branch changes.
---

# Full Share Project

Share a full local project to InFlight for feedback and collaboration.

## Arguments

$ARGUMENTS - Optional path to the project directory. If not provided, uses current working directory.

## Instructions

### Note

For sharing UI changes from a feature branch, use `/inflight:share` instead. It analyzes your git diff and creates a focused prototype.

This command shares the full project as-is.

### 1. Determine project path

Use the provided path argument or current working directory.

### 2. Check for .env files

Look for `.env`, `.env.local`, `.env.development`, `.env.production` in the project directory.

**Only if .env files exist**, ask: "Found .env files. These may contain sensitive API keys. Exclude them from sharing? (recommended: yes)"

### 3. Check for git changes (optional)

If this is a git repository on a feature branch:
1. Run `git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null`
2. If commits exist, suggest using `/inflight:share` workflow instead for better analysis

### 4. Read project files

Read all source files, **excluding**:
- `.git/`
- `node_modules/`
- `dist/`, `build/`, `.next/`, `out/`
- `*.lock` files
- `.env*` files (unless user chose to include)

### 5. Deploy to InFlight

Use the `share` tool with an empty gitDiff:

```json
{
  "files": { "path/to/file": "content", ... },
  "gitDiff": {
    "diff": "",
    "diffStat": "",
    "baseBranch": "main",
    "currentBranch": "main"
  }
}
```

### 6. Display result

Show the InFlight URL:

```
Shared!

InFlight: [URL]

Share this link with your team for feedback.
```

## Related Commands

- `/inflight:share` - Share UI changes from a feature branch (recommended)
- `/inflight:inflight` - Manage prototypes
