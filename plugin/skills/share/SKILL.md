---
name: share
description: Share UI changes from your feature branch as an interactive prototype on Inflight for review. Use when the user wants to share their branch changes, create a preview, or get feedback on UI work.
---

# Share

Share UI changes from your feature branch as an interactive prototype on Inflight for review.

## Arguments

$ARGUMENTS - Optional: a path to the project directory. If not provided, uses current working directory.

## Instructions

### 1. Verify git repository

Run `git status` to verify:
- This is a git repository
- You're on a feature branch (not main/master)
- There are commits to share

If on main/master or no changes, inform the user and stop.

### 2. Share to Inflight

Call the `share` MCP tool:

```json
{
  "directory": "<project directory or omit for cwd>",
  "workspaceId": "<optional workspace ID>",
  "existingProjectId": "<optional, to add a new version to existing project>"
}
```

### 3. Show result

The tool automatically opens the Inflight URL in the browser. Display:

```
Shared to Inflight: [inflightUrl]

Share this link with your team for feedback.
```

If the result includes a `workspace` field, mention which workspace was used. The workspace is auto-selected and remembered. If the user wants to switch, they can use the `set_workspace` or `list_workspaces` MCP tools.

If the result includes a `githubAppTip`, display it to the user after the share result. This encourages them to install the InFlight GitHub App for faster sharing.

If the result includes a `branchNotPushedTip`, display it to the user after the share result. This lets them know they can push their branch to enable faster git clone-based sharing.

## Error Handling

- If not in a git repository: "This folder isn't a git repo — make sure you're in the right project directory."
- If no git diff found: "No changes found to share. Make sure you're on a feature branch with commits."
- If Share API unreachable: "Couldn't reach Inflight servers. Check your internet connection and try again."
