/**
 * Git utilities for collecting repository information during share/deploy operations.
 * Used to track which branch/commit a shared prototype was created from.
 */

import { execSync, execFileSync } from "child_process";

export interface GitInfo {
  branch: string | null;
  commitShort: string | null;
  commitFull: string | null;
  commitMessage: string | null;
  remoteUrl: string | null;
  isDirty: boolean;
  timestamp: string | null;
}

export interface GitDiffResult {
  baseBranch: string;
  currentBranch: string;
  mergeBase: string;
  diff: string;
  diffStat: string;
  isTruncated: boolean;
  totalBytes: number;
}

/**
 * Execute a git command and return the output, or null if it fails.
 */
function gitExec(command: string, cwd: string): string | null {
  try {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Check if a directory is inside a git repository.
 */
export function isGitRepo(projectPath: string): boolean {
  const result = gitExec("git rev-parse --is-inside-work-tree", projectPath);
  return result === "true";
}

/**
 * Check if the repository has uncommitted changes (staged or unstaged).
 */
export function hasUncommittedChanges(projectPath: string): boolean {
  const status = gitExec("git status --porcelain", projectPath);
  return status !== null && status.length > 0;
}

/**
 * Sanitize a git remote URL to remove embedded tokens/credentials.
 * Converts URLs like:
 *   https://token@github.com/org/repo.git → github.com/org/repo
 *   git@github.com:org/repo.git → github.com/org/repo
 */
export function sanitizeRemoteUrl(url: string | null): string | null {
  if (!url) return null;

  // Remove .git suffix
  let cleaned = url.replace(/\.git$/, "");

  // Handle SSH URLs (git@github.com:org/repo)
  if (cleaned.startsWith("git@")) {
    cleaned = cleaned.replace(/^git@/, "").replace(":", "/");
    return cleaned;
  }

  // Handle HTTPS URLs - extract host and path
  try {
    const parsed = new URL(cleaned);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    // If URL parsing fails, return as-is without credentials
    return cleaned.replace(/^https?:\/\/[^@]+@/, "").replace(/^https?:\/\//, "");
  }
}

/**
 * Collect git repository information from a project directory.
 * Returns null if not a git repository.
 */
export function getGitInfo(projectPath: string): GitInfo | null {
  if (!isGitRepo(projectPath)) {
    return null;
  }

  const branch = gitExec("git rev-parse --abbrev-ref HEAD", projectPath);
  const commitShort = gitExec("git rev-parse --short HEAD", projectPath);
  const commitFull = gitExec("git rev-parse HEAD", projectPath);
  const commitMessage = gitExec("git log -1 --format=%s", projectPath);
  const rawRemoteUrl = gitExec("git remote get-url origin", projectPath);
  const timestamp = gitExec("git log -1 --format=%cI", projectPath);
  const isDirty = hasUncommittedChanges(projectPath);

  return {
    branch,
    commitShort,
    commitFull,
    commitMessage,
    remoteUrl: sanitizeRemoteUrl(rawRemoteUrl),
    isDirty,
    timestamp,
  };
}

/**
 * Get the default branch name (main or master).
 * Returns null if no default branch can be determined.
 */
export function getDefaultBranch(projectPath: string): string | null {
  if (!isGitRepo(projectPath)) {
    return null;
  }

  // Try 'main' first, then 'master'
  const branches = ["main", "master"];
  for (const branch of branches) {
    const result = gitExec(`git rev-parse --verify ${branch}`, projectPath);
    if (result !== null) {
      return branch;
    }
  }

  // Fallback: check origin/HEAD
  const originHead = gitExec(
    "git symbolic-ref refs/remotes/origin/HEAD",
    projectPath
  );
  if (originHead) {
    return originHead.replace("refs/remotes/origin/", "");
  }

  return null;
}

/**
 * Get git diff between current branch and base branch (main/master by default).
 * Returns null if not in a git repo, on the default branch, or no changes.
 *
 * @param projectPath - The project directory
 * @param maxBytes - Maximum bytes to include in diff (default 50KB)
 * @param baseBranch - Base branch to diff against (auto-detected if not provided)
 * @returns GitDiffResult or null if no diff available
 */
export function getGitDiff(
  projectPath: string,
  maxBytes: number = 50000,
  baseBranch?: string
): GitDiffResult | null {
  if (!isGitRepo(projectPath)) {
    return null;
  }

  const defaultBranch = baseBranch || getDefaultBranch(projectPath);
  if (!defaultBranch) {
    return null;
  }

  const currentBranch = gitExec("git rev-parse --abbrev-ref HEAD", projectPath);
  if (!currentBranch || currentBranch === defaultBranch) {
    // On the default branch, no diff to compare
    return null;
  }

  // Get the merge base to compare against
  const mergeBase = gitExec(
    `git merge-base ${defaultBranch} HEAD`,
    projectPath
  );
  if (!mergeBase) {
    return null;
  }

  // Get diff stat for summary
  const diffStat =
    gitExec(`git diff --stat ${mergeBase}...HEAD`, projectPath) || "";

  // Get actual diff
  const diff = gitExec(`git diff ${mergeBase}...HEAD`, projectPath);

  if (!diff || diff.length === 0) {
    return null;
  }

  const isTruncated = diff.length > maxBytes;
  const truncatedDiff = isTruncated
    ? diff.substring(0, maxBytes) + "\n... (truncated)"
    : diff;

  return {
    baseBranch: defaultBranch,
    currentBranch,
    mergeBase: mergeBase.substring(0, 7),
    diff: truncatedDiff,
    diffStat,
    isTruncated,
    totalBytes: diff.length,
  };
}

/**
 * Auto-commit all uncommitted changes with a message linking to the InFlight share.
 * Returns the new commit SHA, or null if the commit failed.
 *
 * @param projectPath - The project directory
 * @param inflightVersionId - The InFlight version ID for the commit message
 * @returns The new short commit SHA, or null if commit failed
 */
export function autoCommitForShare(
  projectPath: string,
  inflightVersionId: string
): string | null {
  if (!isGitRepo(projectPath)) {
    return null;
  }

  if (!hasUncommittedChanges(projectPath)) {
    // No changes to commit
    return null;
  }

  try {
    // Stage all changes
    execSync("git add -A", {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Commit with InFlight share message
    const commitMessage = `InFlight share: ${inflightVersionId}`;
    execFileSync("git", ["commit", "-m", commitMessage], {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Return the new commit SHA
    return gitExec("git rev-parse --short HEAD", projectPath);
  } catch {
    return null;
  }
}
