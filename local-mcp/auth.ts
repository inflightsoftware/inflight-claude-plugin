/**
 * InFlight Authentication Utilities
 *
 * Handles authentication flow for MCP InFlight.
 * Uses a localhost HTTP server callback pattern for browser-based auth.
 *
 * Ported from inflight/packages/mcp-inflight/src/utils/auth.ts
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Storage location for auth data
const AUTH_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".claude",
  "mcp-inflight-auth.json"
);

// InFlight web app URL (can be overridden via environment)
// Defaults to production; use INFLIGHT_URL=http://localhost:5173 for local dev
const INFLIGHT_BASE = process.env.INFLIGHT_URL || "https://vite.inflight.co";

/**
 * Stored authentication data
 */
export interface AuthData {
  apiKey: string;
  userId: string;
  email?: string;
  name?: string;
  defaultWorkspaceId?: string;
  createdAt: string;
}

/**
 * Read stored authentication data from disk
 */
export function getAuthData(): AuthData | null {
  try {
    const content = fs.readFileSync(AUTH_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save authentication data to disk
 */
export function saveAuthData(data: AuthData): void {
  const dir = path.dirname(AUTH_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * Clear stored authentication data
 */
export function clearAuthData(): void {
  try {
    fs.unlinkSync(AUTH_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthData() !== null;
}

/**
 * Open a URL in the user's default browser
 */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      await execAsync(`open "${url}"`);
    } else if (platform === "win32") {
      await execAsync(`start "" "${url}"`);
    } else {
      // Linux and others
      await execAsync(`xdg-open "${url}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open browser. Please manually visit: ${url}`);
  }
}

/**
 * Log function type for MCP logging
 */
export type LogFn = (message: string) => void;

/**
 * Authenticate with InFlight using browser-based OAuth flow
 *
 * 1. Starts a temporary HTTP server on localhost
 * 2. Opens InFlight auth URL in browser
 * 3. Waits for callback with API key
 * 4. Stores credentials locally
 */
export async function authenticate(log: LogFn): Promise<AuthData> {
  return new Promise((resolve, reject) => {
    // Start temporary HTTP server on random port
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost`);

      if (url.pathname === "/callback") {
        const apiKey = url.searchParams.get("api_key");
        const userId = url.searchParams.get("user_id");
        const email = url.searchParams.get("email");
        const name = url.searchParams.get("name");

        if (!apiKey || !userId) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 2rem; text-align: center;">
                <h1 style="color: #e53e3e;">Authentication Failed</h1>
                <p>Missing API key or user ID. Please try again.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error("Missing API key or user ID in callback"));
          return;
        }

        // Success response with InFlight branding
        const displayName = name || email || "there";
        const safeDisplayName = escapeHtml(displayName);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Authenticated - InFlight</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background-color: #15161C;
                  color: #F9FAFB;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container {
                  background-color: #0F1012;
                  border: 1px solid #1F2025;
                  border-radius: 16px;
                  padding: 48px;
                  text-align: center;
                  max-width: 400px;
                  width: 90%;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
                }
                .logo {
                  margin-bottom: 32px;
                }
                .success-icon {
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, #1C8AF8 0%, #60ADFA 100%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 24px;
                }
                .success-icon svg {
                  width: 32px;
                  height: 32px;
                }
                h1 {
                  font-size: 24px;
                  font-weight: 600;
                  margin-bottom: 8px;
                  color: #F9FAFB;
                }
                .greeting {
                  font-size: 16px;
                  color: #98A1AE;
                  margin-bottom: 24px;
                }
                .message {
                  font-size: 14px;
                  color: #697282;
                  line-height: 1.5;
                }
                .close-hint {
                  margin-top: 24px;
                  padding-top: 24px;
                  border-top: 1px solid #1F2025;
                  font-size: 13px;
                  color: #697282;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="41" height="25" viewBox="0 0 41 25" fill="none">
                    <path d="M23.1244 23.6849C22.6097 24.7058 21.0702 24.3421 21.0668 23.1988L21.0015 1.1163C20.9987 0.188062 22.0857 -0.316302 22.7927 0.285127L39.6536 14.6273C40.526 15.3694 39.8055 16.782 38.6925 16.5114L28.8843 14.127C28.3931 14.0076 27.8845 14.2426 27.6569 14.6939L23.1244 23.6849Z" fill="white"/>
                    <path d="M16.9597 23.6651C17.4771 24.6846 19.0157 24.3168 19.016 23.1735L19.0223 1.09085C19.0225 0.162606 17.9342 -0.338848 17.2288 0.26447L0.406372 14.6517C-0.464095 15.3961 0.260202 16.8068 1.37245 16.5333L11.1743 14.1226C11.6651 14.0019 12.1744 14.2355 12.4032 14.6862L16.9597 23.6651Z" fill="white"/>
                  </svg>
                </div>
                <div class="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h1>You're connected!</h1>
                <p class="greeting">Welcome, ${safeDisplayName}</p>
                <p class="message">InFlight is now connected to Claude Code. You can share prototypes and get feedback directly from your terminal.</p>
                <p class="close-hint">This window will close automatically...</p>
              </div>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);

        // Save auth data
        const authData: AuthData = {
          apiKey,
          userId,
          email: email || undefined,
          name: name || undefined,
          createdAt: new Date().toISOString(),
        };
        saveAuthData(authData);

        server.close();
        resolve(authData);
      } else {
        // Unknown path
        res.writeHead(404);
        res.end("Not found");
      }
    });

    // Handle server errors
    server.on("error", (err) => {
      reject(new Error(`Failed to start auth server: ${err.message}`));
    });

    // Start listening on random available port
    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to get server address"));
        return;
      }

      const port = address.port;
      const authUrl = `${INFLIGHT_BASE}/mcp/auth?callback_port=${port}`;

      log("Opening browser for InFlight authentication...");
      log(`If browser doesn't open, visit: ${authUrl}`);

      try {
        await openBrowser(authUrl);
      } catch (error) {
        log(`Could not open browser automatically. Please visit: ${authUrl}`);
      }
    });

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 5 minutes"));
    }, 300000);

    // Clear timeout on success
    server.on("close", () => {
      clearTimeout(timeout);
    });
  });
}
