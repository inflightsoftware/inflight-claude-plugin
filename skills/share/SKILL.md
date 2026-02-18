---
name: share
description: Share UI changes from your feature branch as an interactive prototype on InFlight for review. Use when the user wants to share their branch changes, create a preview, or get feedback on UI work.
---

# Share

Share UI changes from your feature branch as an interactive prototype on InFlight for review.

## Arguments

$ARGUMENTS - Optional: a path to the project directory. If not provided, uses current working directory.

## Instructions

### 1. Verify git repository

Run `git status` to verify:
- This is a git repository
- You're on a feature branch (not main/master)
- There are commits to share

If on main/master or no changes, inform the user and stop.

### 2. Share to InFlight

Call the `share` MCP tool:

```json
{
  "directory": "<project directory or omit for cwd>",
  "workspaceId": "<optional workspace ID>",
  "existingProjectId": "<optional, to add a new version to existing project>"
}
```

This tool will:
- Read all project files (excluding .git, node_modules, etc.)
- Get git diff against main/master
- Upload to a cloud sandbox
- Run Claude analysis to create a prototype
- Deploy the prototype with ngrok tunnel
- Create an InFlight version

### 3. Show result

The tool automatically opens the InFlight URL in the browser. Display:

```
Share Complete!

InFlight: [inflightUrl]

Your UI changes have been analyzed and deployed for review.
Share this link with your team for feedback.
```

## Error Handling

- If not in a git repository, explain the user needs to be in a git repo
- If Share API is not running, tell user to start it with: `cd apps/share-api && pnpm dev`
- If no git diff found, explain the user needs commits on a feature branch

## Related Commands

- `/inflight:full-share` - Share the full project to InFlight (not just branch changes)
- `/inflight:inflight` - Manage prototypes, list, delete
