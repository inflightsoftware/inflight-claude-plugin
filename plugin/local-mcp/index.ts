/**
 * Inflight Local MCP Server
 *
 * Architecture:
 * - Share API (Node.js :3002): All share operations
 *   - Sandbox creation, file upload, analysis, deployment
 *   - Version creation, sandbox tracking, diff summaries, review questions
 * - Auth handled locally via browser OAuth flow
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getAuthData, isAuthenticated, authenticate, clearAuthData } from "./auth.js";
import { analyzeProjectDependencies } from "./analyzers/dependency-analyzer.js";
import {
  needsChunkedUpload,
  chunkFiles,
  calculateTotalSize as calculateChunkTotalSize,
  getChunkStats,
  readProjectFiles,
  readSpecificFiles,
  type FileMap,
} from "./utils/file-utils.js";
import { toFriendlyMessage, resetMessageState } from "./utils/progress-messages.js";

// Environment-based URL configuration
// Set INFLIGHT_ENV=local in .mcp.json to use local dev servers
const ENVIRONMENTS = {
  local: { shareApi: "http://localhost:3002" },
  staging: { shareApi: "https://share-api-staging-2762.up.railway.app" },
  production: { shareApi: "https://share-api.inflight.co" },
} as const;

const ENV = (process.env.INFLIGHT_ENV || "production") as keyof typeof ENVIRONMENTS;
const SHARE_API_URL = process.env.SHARE_API_URL || ENVIRONMENTS[ENV].shareApi;

/**
 * Open a URL in the default browser
 */
function openInBrowser(url: string): void {
  try {
    const platform = process.platform;
    let cmd: string;

    if (platform === "darwin") {
      cmd = `open "${url}"`;
    } else if (platform === "win32") {
      cmd = `start "" "${url}"`;
    } else {
      // Linux and others
      cmd = `xdg-open "${url}"`;
    }

    execSync(cmd, { stdio: "ignore" });
  } catch {
    // Silently fail - URL opening is nice-to-have, not critical
  }
}

/**
 * Get git information from a directory
 */
function getGitInfo(dir: string): {
  isGitRepo: boolean;
  currentBranch?: string;
  baseBranch?: string;
  gitUrl?: string;
  diff?: string;
  diffStat?: string;
  branchExistsOnRemote?: boolean;
} {
  try {
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe' });
  } catch {
    return { isGitRepo: false };
  }

  try {
    const currentBranch = execSync('git branch --show-current', { cwd: dir, encoding: 'utf-8' }).trim();

    let gitUrl: string | undefined;
    try {
      gitUrl = execSync('git remote get-url origin', { cwd: dir, encoding: 'utf-8' }).trim();
    } catch {}

    // Determine base branch (main or master)
    let baseBranch = 'main';
    try {
      execSync('git show-ref --verify --quiet refs/heads/main', { cwd: dir, stdio: 'pipe' });
    } catch {
      try {
        execSync('git show-ref --verify --quiet refs/heads/master', { cwd: dir, stdio: 'pipe' });
        baseBranch = 'master';
      } catch {}
    }

    // Get diff against base branch
    // Try local branch first, then remote tracking branch (handles worktree/stale local main)
    let diff = '';
    let diffStat = '';
    const diffTargets = [
      `${baseBranch}...HEAD`,
      `origin/${baseBranch}...HEAD`,
      'HEAD',
    ];
    for (const target of diffTargets) {
      try {
        const cmd = target === 'HEAD' ? 'git diff HEAD' : `git diff ${target}`;
        diff = execSync(cmd, { cwd: dir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        diffStat = execSync(`${cmd} --stat`, { cwd: dir, encoding: 'utf-8' });
        if (diff) break;
      } catch {
        continue;
      }
    }

    // Check if the current branch exists on the remote
    let branchExistsOnRemote = false;
    try {
      const lsRemoteOutput = execSync(`git ls-remote --heads origin ${currentBranch}`, { cwd: dir, encoding: 'utf-8' }).trim();
      branchExistsOnRemote = lsRemoteOutput.length > 0;
    } catch {
      branchExistsOnRemote = false;
    }

    return {
      isGitRepo: true,
      currentBranch,
      baseBranch,
      gitUrl,
      diff,
      diffStat,
      branchExistsOnRemote,
    };
  } catch {
    return { isGitRepo: true };
  }
}

// ============= Share API Client =============

async function shareApiHealthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${SHARE_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============= MCP Server =============

const server = new McpServer(
  {
    name: "inflight-local",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {}, // Enable logging capability for sendLoggingMessage
      prompts: {}, // Enable prompts (slash commands)
    },
  }
);

/**
 * Helper to send log messages to the MCP client terminal
 * Falls back to console.error if not connected yet
 */
async function log(message: string, level: "info" | "debug" | "warning" | "error" = "info") {
  // Always log to stderr for debugging
  console.error(`[Inflight] ${message}`);

  // Also send to MCP client if available
  try {
    await server.server.sendLoggingMessage({
      level,
      data: message,
      logger: "inflight-local",
    });
  } catch {
    // Ignore if not connected yet
  }
}


// Tool: Check authentication status
server.tool(
  "auth_status",
  "Check if you're signed in to Inflight",
  {},
  async () => {
    const authData = getAuthData();
    if (authData) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            authenticated: true,
            userId: authData.userId,
            email: authData.email,
            name: authData.name,
            createdAt: authData.createdAt,
          }, null, 2),
        }],
      };
    }
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ authenticated: false }, null, 2),
      }],
    };
  }
);

// Tool: Authenticate with Inflight
server.tool(
  "inflight_login",
  "Sign in to Inflight. Opens a browser window to log in.",
  {
    force: z.boolean().optional().describe("Force re-authentication even if already logged in"),
  },
  async (args) => {
    // Check if already authenticated
    const existingAuth = getAuthData();
    if (existingAuth && !args.force) {
      console.error(`[Local MCP] Already authenticated as ${existingAuth.email || existingAuth.userId}`);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message: `Already authenticated as ${existingAuth.email || existingAuth.name || existingAuth.userId}`,
            userId: existingAuth.userId,
            email: existingAuth.email,
            alreadyLoggedIn: true,
          }, null, 2),
        }],
      };
    }

    console.error(`[Local MCP] Starting authentication flow...`);
    try {
      const authData = await authenticate((msg) => console.error(`[Local MCP] ${msg}`));
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message: `Authenticated as ${authData.email || authData.name || authData.userId}`,
            userId: authData.userId,
            email: authData.email,
          }, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Authentication failed: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Logout from Inflight
server.tool(
  "inflight_logout",
  "Sign out of Inflight",
  {},
  async () => {
    const wasAuthenticated = isAuthenticated();
    clearAuthData();
    return {
      content: [{
        type: "text" as const,
        text: wasAuthenticated
          ? "Signed out of Inflight."
          : "You weren't signed in.",
      }],
    };
  }
);

// Tool: Get git info
server.tool(
  "get_git_info",
  "Get branch and change info from a git project",
  {
    directory: z.string().optional().describe("Directory path (defaults to cwd)"),
  },
  async (args) => {
    const dir = args.directory || process.cwd();
    console.error(`[Local MCP] Getting git info for: ${dir}`);

    const info = getGitInfo(dir);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(info, null, 2),
      }],
    };
  }
);

// Tool: Analyze dependencies for partial share
server.tool(
  "analyze_dependencies",
  "Analyze which files are needed for a partial share based on what changed.",
  {
    projectPath: z.string().describe("Absolute path to the project root directory"),
    changedFiles: z.array(z.string()).optional().describe("Array of changed file paths relative to project root. Auto-detected from git diff if not provided."),
    baseBranch: z.string().optional().describe("Base branch to diff against (default: main or master)"),
  },
  async (args) => {
    console.error(`[Local MCP] Analyzing dependencies for: ${args.projectPath}`);

    try {
      const result = await analyzeProjectDependencies(
        args.projectPath,
        args.changedFiles,
        args.baseBranch
      );

      console.error(`[Local MCP] Analysis complete in ${result.metadata.analysisTimeMs}ms`);
      console.error(`[Local MCP]   Changed files: ${result.changedFiles.length}`);
      console.error(`[Local MCP]   Entry points: ${result.metadata.entryPoints.length}`);
      console.error(`[Local MCP]   Local files: ${result.dependencies.localFiles.length}`);
      console.error(`[Local MCP]   NPM packages: ${result.dependencies.npmPackages.length}`);
      console.error(`[Local MCP]   Workspace packages: ${result.dependencies.workspacePackages.length}`);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Local MCP] Analysis failed: ${message}`);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Share
server.tool(
  "share",
  "Share your project to Inflight for review. Uploads your code, builds a live prototype, and creates a shareable link.",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)"),
    workspaceId: z.string().optional().describe("Inflight workspace ID"),
    existingProjectId: z.string().optional().describe("Add version to existing project"),
    useStaticAnalysis: z.boolean().optional().describe("Use static dependency analysis to upload only relevant files (experimental, default: false)"),
  },
  async (args, extra) => {
    const dir = args.directory || process.cwd();

    // Get progressToken from _meta - required for progress notifications to show in Claude Code
    const progressToken = (extra as any)._meta?.progressToken;

    // Reset friendly message deduplication state for this share operation
    resetMessageState();

    // Helper to send progress notifications to MCP client
    // Logs the raw message for debugging, but shows a friendly version to the user
    const sendProgress = async (progress: number, total: number, message?: string) => {
      if (message) {
        // Always log the raw technical message to stderr for debugging
        await log(`[${progress}%] ${message}`);
      }

      if (message && progressToken && extra.sendNotification) {
        // Map to a friendly user-facing message (with deduplication)
        const friendly = toFriendlyMessage(progress, message);
        if (friendly) {
          try {
            await extra.sendNotification({
              method: "notifications/progress",
              params: {
                progressToken,
                progress,
                total,
                message: friendly,
              },
            });
          } catch {
            // Ignore errors sending progress
          }
        }
      }
    };

    await sendProgress(0, 100, "Preparing to share...");

    if (!existsSync(dir)) {
      return {
        content: [{ type: "text" as const, text: `Couldn't find that directory: ${dir}` }],
        isError: true,
      };
    }

    // Step 1: Check Share API is running
    await sendProgress(2, 100, "Connecting to Inflight...");
    const csbHealthy = await shareApiHealthCheck();
    if (!csbHealthy) {
      return {
        content: [{
          type: "text" as const,
          text: `Couldn't reach Inflight servers. Check your internet connection and try again.`,
        }],
        isError: true,
      };
    }

    // Step 2: Get git info
    await sendProgress(5, 100, "Reading your changes...");
    const gitInfo = getGitInfo(dir);
    if (!gitInfo.isGitRepo) {
      return {
        content: [{ type: "text" as const, text: "This folder isn't a git repo — make sure you're in the right project directory." }],
        isError: true,
      };
    }

    const isFullShare = !gitInfo.diff;
    if (isFullShare) {
      await log("No branch diff found — sharing the full project instead.");
    }

    await log(`Branch: ${gitInfo.currentBranch}`);

    // Step 3: Check auth (before file reading to enable clone check)
    let authData = getAuthData();
    if (!authData) {
      await sendProgress(8, 100, "Authenticating with InFlight...");
      try {
        authData = await authenticate((msg) => log(msg));
      } catch (authError) {
        const authMessage = authError instanceof Error ? authError.message : String(authError);
        return {
          content: [{ type: "text" as const, text: `Couldn't sign in to Inflight. Try running /inflight login first.\n\n${authMessage}` }],
          isError: true,
        };
      }
    }

    // Step 3b: Check if git clone mode is available (skip file upload if so)
    let useGitClone = false;
    let githubAppTip: string | null = null;
    if (gitInfo.gitUrl && args.workspaceId) {
      try {
        await sendProgress(9, 100, "Checking repository access...");
        const checkResponse = await fetch(`${SHARE_API_URL}/share/check-clone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.apiKey}`,
          },
          body: JSON.stringify({
            gitUrl: gitInfo.gitUrl,
            workspaceId: args.workspaceId,
          }),
        });
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json() as { cloneAvailable: boolean };
          useGitClone = checkResult.cloneAvailable === true;
          if (useGitClone) {
            await log(`  Git clone available for ${gitInfo.gitUrl}`);
          } else if (gitInfo.gitUrl.includes("github.com")) {
            // GitHub repo detected but no app installed - include tip in final result
            await log(`  GitHub repo detected but InFlight GitHub App not installed for this workspace`);
            githubAppTip = "Tip: Install the InFlight GitHub App to make sharing faster. Instead of uploading files, InFlight can clone your repo directly. Install it here: https://github.com/apps/inflight-app/installations/new";
          }
        }
      } catch {
        await log(`  Clone check failed, falling back to file upload`);
      }
    }

    if (useGitClone) {
      // Clone-based share: skip file reading/upload entirely
      await sendProgress(10, 100, "Git clone available, skipping file upload...");

      try {
        const result = await callCloneShareWithSSE(
          {
            gitDiff: {
              diff: gitInfo.diff,
              diffStat: gitInfo.diffStat || '',
              baseBranch: gitInfo.baseBranch || 'main',
              currentBranch: gitInfo.currentBranch || 'unknown',
            },
            gitUrl: gitInfo.gitUrl!,
            currentBranch: gitInfo.currentBranch || 'unknown',
            workspaceId: args.workspaceId!,
            existingProjectId: args.existingProjectId,
          },
          authData.apiKey,
          // Remap server percentages (0-100) to our range (10-100)
          // so progress never jumps backwards after local steps reach 10%
          async (percentage: number, step: string) => {
            const remapped = 10 + Math.floor((percentage / 100) * 90);
            await sendProgress(remapped, 100, step);
          },
          async (message: string) => {
            await log(`Server error: ${message}`, "error");
          }
        );

        await sendProgress(100, 100, "Share complete!");
        await log("========== SUCCESS (clone mode) ==========");
        await log(`Preview URL: ${result.previewUrl}`);
        await log(`InFlight URL: ${result.inflightUrl}`);

        openInBrowser(result.inflightUrl);
        await log("Opening InFlight in browser...");

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              previewUrl: result.previewUrl,
              sandboxUrl: result.sandboxUrl,
              sandboxId: result.sandboxId,
              inflightUrl: result.inflightUrl,
              versionId: result.versionId,
              projectId: result.projectId,
              cloneMode: true,
              diffSummary: result.diffSummary,
            }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log(`Clone share failed: ${message}`, "warning");
        await log(`Falling back to file upload...`);
        // Fall through to standard file upload below
      }
    }

    // Step 4: Read project files (skipped if clone succeeded above)
    let files: FileMap;
    let usedStaticAnalysis = false;

    if (args.useStaticAnalysis) {
      // Experimental: Use static dependency analysis to upload only relevant files
      await sendProgress(10, 100, "Analyzing dependencies...");
      try {
        const analysisResult = await analyzeProjectDependencies(dir, undefined, gitInfo.baseBranch);
        const localFiles = analysisResult.dependencies.localFiles;

        await log(`  Analysis completed in ${analysisResult.metadata.analysisTimeMs}ms`);
        await log(`  Changed files: ${analysisResult.changedFiles.length}`);
        await log(`  UI-relevant entry points: ${analysisResult.metadata.entryPoints.length}`);
        await log(`  Local dependencies: ${localFiles.length}`);
        await log(`  NPM packages: ${analysisResult.dependencies.npmPackages.length}`);

        if (localFiles.length > 0) {
          await sendProgress(11, 100, `Reading ${localFiles.length} analyzed files...`);
          files = readSpecificFiles(dir, localFiles, true, true);
          usedStaticAnalysis = true;
          await log(`  Using static analysis: ${Object.keys(files).length} files to upload`);
        } else {
          await log(`  No UI-relevant dependencies found, falling back to full upload`);
          await sendProgress(11, 100, "Reading all project files...");
          files = readProjectFiles(dir, true);
        }
      } catch (analysisError) {
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        await log(`  Static analysis failed: ${errorMsg}`, "warning");
        await log(`  Falling back to full project upload`);
        await sendProgress(11, 100, "Reading all project files...");
        files = readProjectFiles(dir, true);
      }
    } else {
      // Default: Read all project files
      await sendProgress(10, 100, "Reading project files...");
      files = readProjectFiles(dir, true);
    }

    const fileCount = Object.keys(files).length;
    const totalSize = calculateChunkTotalSize(files);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    await log(`  ${usedStaticAnalysis ? "Analyzed" : "Found"} ${fileCount} files (${sizeMB} MB)`);

    // Step 5: Check if chunked upload is needed
    const filesAsFileMap = files as FileMap;
    const useChunkedUpload = needsChunkedUpload(filesAsFileMap);

    if (useChunkedUpload) {
      await sendProgress(12, 100, "Uploading project...");

      try {
        const result = await callChunkedShare(
          filesAsFileMap,
          {
            diff: gitInfo.diff,
            diffStat: gitInfo.diffStat || '',
            baseBranch: gitInfo.baseBranch || 'main',
            currentBranch: gitInfo.currentBranch || 'unknown',
          },
          authData.apiKey,
          args.workspaceId,
          args.existingProjectId,
          gitInfo.gitUrl,
          async (percentage: number, step: string) => {
            await sendProgress(percentage, 100, step);
          },
          async (message) => {
            await log(`Error: ${message}`, "error");
          }
        );

        await sendProgress(100, 100, "Done!");

        openInBrowser(result.inflightUrl);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              previewUrl: result.previewUrl,
              sandboxUrl: result.sandboxUrl,
              sandboxId: result.sandboxId,
              inflightUrl: result.inflightUrl,
              versionId: result.versionId,
              projectId: result.projectId,
              fileCount,
              chunkedUpload: true,
              ...(githubAppTip && { githubAppTip }),
            }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text" as const,
            text: `Something went wrong while sharing: ${message}`,
          }],
          isError: true,
        };
      }
    }

    // Step 5b: Standard upload (< 3MB)
    await sendProgress(12, 100, `Uploading ${sizeMB} MB to Inflight...`);

    try {
      const result = await callShareWithSSE(
        {
          files,
          gitDiff: {
            diff: gitInfo.diff,
            diffStat: gitInfo.diffStat || '',
            baseBranch: gitInfo.baseBranch || 'main',
            currentBranch: gitInfo.currentBranch || 'unknown',
          },
          userId: authData.userId,
          workspaceId: args.workspaceId,
          existingProjectId: args.existingProjectId,
          gitUrl: gitInfo.gitUrl,
        },
        authData.apiKey,
        // Progress callback - remap server percentages (0-100) to our range (12-100)
        // so progress never jumps backwards after local steps reach 12%
        async (percentage: number, step: string) => {
          const remapped = 12 + Math.floor((percentage / 100) * 88);
          await sendProgress(remapped, 100, step);
        },
        async (message) => {
          await log(`Error: ${message}`, "error");
        }
      );

      await sendProgress(100, 100, "Done!");

      openInBrowser(result.inflightUrl);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            previewUrl: result.previewUrl,
            sandboxUrl: result.sandboxUrl,
            ngrokUrl: result.ngrokUrl || null,
            sandboxId: result.sandboxId,
            inflightUrl: result.inflightUrl,
            versionId: result.versionId,
            projectId: result.projectId,
            fileCount,
            diffSummary: result.diffSummary,
            ...(githubAppTip && { githubAppTip }),
          }, null, 2),
        }],
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text" as const,
          text: `Something went wrong while sharing: ${message}`,
        }],
        isError: true,
      };
    }
  }
);

/**
 * Call the consolidated /share endpoint with SSE streaming
 */
interface ShareRequest {
  files: Record<string, string>;
  gitDiff: {
    diff: string;
    diffStat: string;
    baseBranch: string;
    currentBranch: string;
  };
  userId: string;
  workspaceId?: string;
  existingProjectId?: string;
  gitUrl?: string;
}

interface ShareResult {
  inflightUrl: string;
  versionId: string;
  projectId: string;
  sandboxId: string;
  sandboxUrl: string;
  previewUrl: string;
  ngrokUrl?: string;
  diffSummary?: {
    summary: string;
    keyChanges: string[];
    affectedAreas?: string[];
  };
}

async function callShareWithSSE(
  request: ShareRequest,
  apiKey: string,
  onProgress: (percentage: number, step: string) => Promise<void>,
  onError: (message: string) => Promise<void>
): Promise<ShareResult> {
  const url = `${SHARE_API_URL}/share`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Share failed (${response.status}): ${errorText || "Empty response"}`);
  }

  // Process SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));

          if (currentEvent === "progress" || (!currentEvent && data.step)) {
            const pct = data.percentage || 0;
            const step = data.step || "Processing...";
            await onProgress(pct, step);
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary,
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Share failed");
            throw new Error(data.message || "Share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Share failed") {
            // Ignore JSON parse errors, rethrow share errors
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }

  throw new Error("Share stream ended without completion");
}

/**
 * Call the /share/clone endpoint with SSE streaming (git clone-based share)
 */
interface CloneShareRequest {
  gitDiff: {
    diff: string;
    diffStat: string;
    baseBranch: string;
    currentBranch: string;
  };
  gitUrl: string;
  currentBranch: string;
  workspaceId: string;
  existingProjectId?: string;
}

async function callCloneShareWithSSE(
  request: CloneShareRequest,
  apiKey: string,
  onProgress: (percentage: number, step: string) => Promise<void>,
  onError: (message: string) => Promise<void>
): Promise<ShareResult> {
  const url = `${SHARE_API_URL}/share/clone`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clone share failed (${response.status}): ${errorText || "Empty response"}`);
  }

  // Process SSE stream (same as callShareWithSSE)
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));

          if (currentEvent === "progress" || (!currentEvent && data.step)) {
            const pct = data.percentage || 0;
            const step = data.step || "Processing...";
            await onProgress(pct, step);
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary,
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Clone share failed");
            throw new Error(data.message || "Clone share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Clone share failed") {
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }

  throw new Error("Clone share stream ended without completion");
}

/**
 * Call chunked share endpoints for large projects (> 3MB)
 */
interface GitDiffInfo {
  diff: string;
  diffStat: string;
  baseBranch: string;
  currentBranch: string;
}

async function callChunkedShare(
  files: FileMap,
  gitDiff: GitDiffInfo,
  apiKey: string,
  workspaceId: string | undefined,
  existingProjectId: string | undefined,
  gitUrl: string | undefined,
  onProgress: (percentage: number, step: string) => Promise<void>,
  onError: (message: string) => Promise<void>
): Promise<ShareResult> {
  const chunks = chunkFiles(files);
  const stats = getChunkStats(chunks);

  // Step 1: Initialize chunked upload
  await onProgress(8, "Uploading project...");
  const initResponse = await fetch(`${SHARE_API_URL}/share/chunked/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      gitDiff,
      totalChunks: stats.totalChunks,
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
    }),
  });

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(`Failed to initialize chunked upload: ${errorText}`);
  }

  const { sessionId, sandboxId } = await initResponse.json();

  // Step 2: Upload chunks sequentially
  const totalMB = (stats.totalSize / (1024 * 1024)).toFixed(1);
  let uploadedSize = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkSize = Object.values(chunk).reduce((sum, content) => sum + content.length, 0);
    const chunkProgress = 10 + Math.floor(((i + 1) / chunks.length) * 30); // 10-40%

    uploadedSize += chunkSize;
    const uploadedMB = (uploadedSize / (1024 * 1024)).toFixed(1);
    await onProgress(chunkProgress, `Uploading ${uploadedMB}/${totalMB} MB...`);

    const uploadResponse = await fetch(`${SHARE_API_URL}/share/chunked/${sessionId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        files: chunk,
        chunkIndex: i,
        totalChunks: chunks.length,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload chunk ${i + 1}: ${errorText}`);
    }

    await uploadResponse.json();
  }

  // Step 3: Finalize and get SSE stream
  await onProgress(42, "Building prototype...");

  const finalizeResponse = await fetch(`${SHARE_API_URL}/share/chunked/${sessionId}/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      workspaceId,
      existingProjectId,
      gitUrl,
    }),
  });

  if (!finalizeResponse.ok) {
    const errorText = await finalizeResponse.text();
    throw new Error(`Failed to finalize chunked upload: ${errorText}`);
  }

  // Process SSE stream (same as callShareWithSSE)
  const reader = finalizeResponse.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));

          if (currentEvent === "progress" || (!currentEvent && data.step)) {
            // Remap server progress (5-100) to our range (45-100)
            const serverPct = data.percentage || 0;
            const mappedPct = 45 + Math.floor((serverPct / 100) * 55);
            await onProgress(mappedPct, data.step || "Processing...");
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary,
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Share failed");
            throw new Error(data.message || "Share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Share failed") {
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }

  throw new Error("Chunked share stream ended without completion");
}

// ============= MCP Prompts (slash commands) =============

server.prompt(
  "partial-share",
  "Share UI changes from your feature branch as an interactive prototype on Inflight for review",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)"),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Share my UI changes to Inflight for review.

Steps:
1. Run \`git status\` to verify this is a git repo on a feature branch with commits. If on main/master or no changes, let me know and stop.
2. Call the \`share\` MCP tool with directory set to the current project directory (${args.directory || "use your working directory"}).
3. Show the result: "Shared to Inflight: [inflightUrl] — Share this link with your team for feedback."

IMPORTANT: Always pass the \`directory\` parameter to the share tool — do not rely on defaults.`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "full-share",
  "Share your entire project to Inflight for feedback and collaboration",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)"),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Share my full project to Inflight for feedback.

Steps:
1. If this is a git repo on a feature branch with commits, suggest using /partial-share instead for a more focused share.
2. Read all source files, excluding: .git/, node_modules/, dist/, build/, .next/, out/, *.lock files, and .env* files. Always exclude .env files — never include them.
3. Call the \`share\` MCP tool with the files, an empty gitDiff, and directory set to the current project directory (${args.directory || "use your working directory"}).
4. Show the result: "Shared to Inflight: [URL] — Share this link with your team for feedback."

IMPORTANT: Always pass the \`directory\` parameter to the share tool — do not rely on defaults. Always exclude .env files.`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "manage",
  "Manage Inflight prototypes — list, delete, or view shared prototypes and projects",
  {
    action: z.string().optional().describe("Action: list, delete, or projects"),
  },
  async (args) => {
    const action = args.action?.toLowerCase();
    let instructions: string;

    if (action === "list") {
      instructions = `List my Inflight prototypes. Call the \`prototype_list\` MCP tool and show results as a formatted list with: Project Name, Type, Status, Inflight URL, and Created date. If none found, say "No prototypes yet. Use /share to share your first one."`;
    } else if (action === "delete") {
      instructions = `Help me delete an Inflight prototype. First call \`prototype_list\` to show my prototypes. Ask which one to delete. Confirm with "Delete [name]? This can't be undone." Then call \`prototype_delete\` with the sandbox ID.`;
    } else if (action === "projects") {
      instructions = `List my Inflight projects. Call the \`list_projects\` MCP tool and show results as a formatted list with: Project Name, Description, and Created date.`;
    } else {
      instructions = `I want to manage my Inflight prototypes. Ask me what I'd like to do:
- **List prototypes** — Show all shared prototypes
- **Delete prototype** — Remove a prototype
- **List projects** — Show all projects

Then execute the selected action.`;
    }

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: instructions,
          },
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Inflight] Ready");
}

main().catch((error) => {
  console.error("[Local MCP] Fatal error:", error);
  process.exit(1);
});
