---
name: full-share
description: Share a full local project to Inflight for feedback and collaboration. Use for sharing entire projects rather than branch changes.
---

# Full Share

Share a full local project to Inflight for feedback and collaboration.

## Arguments

$ARGUMENTS - Optional path to the project directory. If not provided, uses current working directory.

## Instructions

### Note

For sharing UI changes from a feature branch, use `/inflight:share` instead — it focuses on just your recent changes.

### 1. Determine project path

Use the provided path argument or current working directory.

### 2. Check for .env files

Look for `.env`, `.env.local`, `.env.development`, `.env.production` in the project directory.

**Only if .env files exist**, ask: "Found .env files — these may contain API keys. Exclude them? (recommended: yes)"

### 3. Check for git changes (optional)

If this is a git repository on a feature branch:
1. Run `git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null`
2. If commits exist, suggest using `/inflight:share` instead for a more focused share

### 4. Read project files

Read all source files, **excluding**:
- `.git/`
- `node_modules/`
- `dist/`, `build/`, `.next/`, `out/`
- `*.lock` files
- `.env*` files (unless user chose to include)

### 5. Deploy to Inflight

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

```
Shared to Inflight: [URL]

Share this link with your team for feedback.
```
