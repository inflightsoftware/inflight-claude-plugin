---
name: inflight
description: Manage InFlight prototypes and projects. List, delete, or view shared prototypes and projects.
---

# InFlight

Manage InFlight prototypes and projects.

## Arguments

$ARGUMENTS - Optional action: `list`, `delete`, `projects`. If not provided, shows menu.

## Instructions

### If no argument provided, show menu

Ask the user what they'd like to do using the AskUserQuestion tool with these options:
- **List prototypes** - Show all shared prototypes
- **Delete prototype** - Remove a prototype
- **List projects** - Show all projects

Then execute the selected action below.

### Action: list (or "List prototypes")

Call the `prototype_list` MCP tool.

Display results in a formatted list:
- Project Name
- Type (share or full-share)
- Status
- InFlight URL (constructed as `https://vite.inflight.co/v/[versionId]`)
- Created date

If no prototypes found, inform the user: "No prototypes found. Use /inflight:share to create one."

### Action: delete (or "Delete prototype")

1. First, call `prototype_list` to show available prototypes
2. Ask the user which prototype to delete (by sandbox ID or project name)
3. Confirm: "Delete prototype **[name]**? This will stop it and remove the InFlight version."
4. Call `prototype_delete` with the sandbox ID
5. Confirm deletion to user

### Action: projects (or "List projects")

Call the `list_projects` MCP tool.

Display results in a formatted list:
- Project Name
- Description (if any)
- Created date

## Related Commands

- `/inflight:share` - Share UI changes for review
- `/inflight:full-share` - Share full project
