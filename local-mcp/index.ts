/**
 * InFlight Local MCP Server
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
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { getAuthData, isAuthenticated, authenticate, clearAuthData } from "./auth.js";

// API URL - all share operations go through the share API
const SHARE_API_URL = process.env.SHARE_API_URL || "http://localhost:3002";

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  /^\.git\//,
  /^node_modules\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^out\//,
  /^\.vercel\//,
  /^\.turbo\//,
  /^\.cache\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  /\.DS_Store$/,
  /\.log$/,
];

// Env files - excluded for security
const ENV_PATTERNS = [/^\.env/, /\.env\./];

function shouldExclude(filePath: string): boolean {
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return true;
  }
  const fileName = filePath.split('/').pop() || '';
  if (ENV_PATTERNS.some(pattern => pattern.test(fileName))) {
    return true;
  }
  return false;
}

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
 * Recursively read all files in a directory
 */
function readProjectFiles(rootDir: string): Record<string, string> {
  const files: Record<string, string> = {};

  function walkDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = relative(rootDir, fullPath);

      if (shouldExclude(relativePath)) continue;

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          files[relativePath] = content;
        } catch {
          // Skip files that can't be read as text (binary files)
        }
      }
    }
  }

  walkDir(rootDir);
  return files;
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
    let diff = '';
    let diffStat = '';
    try {
      diff = execSync(`git diff ${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      diffStat = execSync(`git diff ${baseBranch}...HEAD --stat`, { cwd: dir, encoding: 'utf-8' });
    } catch {
      try {
        diff = execSync('git diff HEAD', { cwd: dir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        diffStat = execSync('git diff HEAD --stat', { cwd: dir, encoding: 'utf-8' });
      } catch {}
    }

    return {
      isGitRepo: true,
      currentBranch,
      baseBranch,
      gitUrl,
      diff,
      diffStat,
    };
  } catch {
    return { isGitRepo: true };
  }
}

/**
 * Calculate total size of files
 */
function calculateTotalSize(files: Record<string, string>): number {
  return Object.values(files).reduce((sum, content) => sum + content.length, 0);
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
    },
  }
);

/**
 * Helper to send log messages to the MCP client terminal
 * Falls back to console.error if not connected yet
 */
async function log(message: string, level: "info" | "debug" | "warning" | "error" = "info") {
  // Always log to stderr for debugging
  console.error(`[Local MCP] ${message}`);

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
  "Check InFlight authentication status",
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

// Tool: Authenticate with InFlight
server.tool(
  "inflight_login",
  "Authenticate with InFlight via browser. Opens a browser window for login.",
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

// Tool: Logout from InFlight
server.tool(
  "inflight_logout",
  "Clear stored InFlight authentication credentials",
  {},
  async () => {
    const wasAuthenticated = isAuthenticated();
    clearAuthData();
    return {
      content: [{
        type: "text" as const,
        text: wasAuthenticated
          ? "Successfully logged out from InFlight."
          : "No stored credentials to clear.",
      }],
    };
  }
);

// Tool: Get git info
server.tool(
  "get_git_info",
  "Get git information (branch, diff, remote URL) from a directory",
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

// Tool: Share - uploads to cloud sandbox, runs Claude analysis, creates InFlight version
server.tool(
  "share",
  "Share UI changes for review. Uploads to cloud sandbox, runs Claude analysis, creates InFlight version.",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)"),
    workspaceId: z.string().optional().describe("InFlight workspace ID"),
    existingProjectId: z.string().optional().describe("Add version to existing project"),
  },
  async (args, extra) => {
    const dir = args.directory || process.cwd();

    // Get progressToken from _meta - required for progress notifications to show in Claude Code
    const progressToken = (extra as any)._meta?.progressToken;

    // Helper to send progress notifications to MCP client
    // This shows real-time progress in the user's Claude Code window
    const sendProgress = async (progress: number, total: number, message?: string) => {
      if (message) {
        await log(message);
      }

      if (progressToken && extra.sendNotification) {
        try {
          await extra.sendNotification({
            method: "notifications/progress",
            params: {
              progressToken,
              progress,
              total,
              ...(message && { message }),
            },
          });
        } catch {
          // Ignore errors sending progress
        }
      }
    };

    await log("========== SHARE ==========");
    await sendProgress(0, 100, `Starting share for: ${dir}`);
    await log(`Share API: ${SHARE_API_URL}`);

    if (!existsSync(dir)) {
      await log(`Error: Directory not found: ${dir}`, "error");
      return {
        content: [{ type: "text" as const, text: `Error: Directory not found: ${dir}` }],
        isError: true,
      };
    }

    // Step 1: Check Share API is running
    await sendProgress(2, 100, "Checking Share API...");
    const csbHealthy = await shareApiHealthCheck();
    if (!csbHealthy) {
      await log(`Share API not running at ${SHARE_API_URL}`, "error");
      return {
        content: [{
          type: "text" as const,
          text: `Error: Share API not running at ${SHARE_API_URL}. Start it with: cd apps/share-api && pnpm dev`,
        }],
        isError: true,
      };
    }
    await log("  Share API is healthy");

    // Step 2: Get git info
    await sendProgress(5, 100, "Getting git info...");
    const gitInfo = getGitInfo(dir);
    if (!gitInfo.isGitRepo) {
      await log("Not a git repository", "error");
      return {
        content: [{ type: "text" as const, text: "Error: Not a git repository." }],
        isError: true,
      };
    }

    if (!gitInfo.diff) {
      await log("No git diff found", "error");
      return {
        content: [{ type: "text" as const, text: "Error: No git diff found. Make sure you're on a feature branch with changes." }],
        isError: true,
      };
    }

    await log(`  Branch: ${gitInfo.currentBranch} vs ${gitInfo.baseBranch}`);
    await log(`  Diff size: ${gitInfo.diff.length} bytes`);

    // Step 3: Read project files
    await sendProgress(8, 100, "Reading project files...");
    const files = readProjectFiles(dir);
    const fileCount = Object.keys(files).length;
    const totalSize = calculateTotalSize(files);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    await log(`  Found ${fileCount} files (${sizeMB} MB)`);

    // Step 4: Check auth
    let authData = getAuthData();
    if (!authData) {
      await sendProgress(10, 100, "Authenticating with InFlight...");
      try {
        authData = await authenticate((msg) => log(msg));
        await log(`  Authenticated as ${authData.email || authData.userId}`);
      } catch (authError) {
        const authMessage = authError instanceof Error ? authError.message : String(authError);
        await log(`Authentication failed: ${authMessage}`, "error");
        return {
          content: [{ type: "text" as const, text: `Error: Authentication failed - ${authMessage}` }],
          isError: true,
        };
      }
    } else {
      await log(`  Using cached auth for ${authData.email || authData.userId}`);
    }

    // Step 5: Call consolidated /share endpoint with SSE streaming
    await sendProgress(12, 100, "Starting share on server...");

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
        // Progress callback - called for each SSE progress event
        async (percentage: number, step: string) => {
          // Log with percentage prefix for visibility (matches original inflight implementation)
          await log(`[${percentage}%] ${step}`);
          // Send MCP progress notification
          await sendProgress(percentage, 100, step);
        },
        // Error callback
        async (message) => {
          await log(`Server error: ${message}`, "error");
        }
      );

      await sendProgress(100, 100, "Share complete!");
      await log("========== SUCCESS ==========");
      await log(`Preview URL: ${result.previewUrl}`);
      if (result.ngrokUrl) {
        await log(`Ngrok URL: ${result.ngrokUrl}`);
      }
      await log(`InFlight URL: ${result.inflightUrl}`);

      // Automatically open the InFlight URL in the browser
      openInBrowser(result.inflightUrl);
      await log("Opening InFlight in browser...");

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
          }, null, 2),
        }],
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await log("========== ERROR ==========", "error");
      await log(message, "error");

      return {
        content: [{
          type: "text" as const,
          text: `Error: ${message}`,
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

// Start the server
async function main() {
  console.error("[Local MCP] ========== STARTING ==========");
  console.error(`[Local MCP] Share API: ${SHARE_API_URL}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Local MCP] Server connected and ready");
}

main().catch((error) => {
  console.error("[Local MCP] Fatal error:", error);
  process.exit(1);
});
