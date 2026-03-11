/**
 * Maps raw technical progress messages to user-friendly equivalents.
 *
 * The share flow has these phases:
 * 0-12%   - Local preparation (git, files, auth)
 * 12-42%  - Upload (standard or chunked)
 * 42-70%  - Claude analysis (server-side)
 * 70-90%  - Prototype deploy (install, start server, tunnel)
 * 90-100% - InFlight version creation & finalization
 */

// Content-based overrides (matched against the raw server/MCP message)
const CONTENT_MATCHERS: Array<{ pattern: RegExp; message: string }> = [
  // Local prep phase
  { pattern: /Starting share for/i, message: "Preparing your project..." },
  { pattern: /Checking Share API/i, message: "Preparing your project..." },
  { pattern: /Share API is healthy/i, message: "Preparing your project..." },
  { pattern: /Getting git info/i, message: "Loading your code..." },
  { pattern: /Reading project files|Reading all project/i, message: "Loading your code..." },
  { pattern: /Analyzing dependencies/i, message: "Loading your code..." },
  { pattern: /Reading.*analyzed files/i, message: "Loading your code..." },
  { pattern: /Authenticating with InFlight/i, message: "Loading your code..." },
  { pattern: /Starting share on server/i, message: "Uploading your project..." },

  // Chunked upload phase
  { pattern: /Large project.*chunked/i, message: "Uploading your project..." },
  { pattern: /Splitting into.*chunks/i, message: "Uploading your project..." },
  { pattern: /Initializing chunked/i, message: "Uploading your project..." },
  { pattern: /Uploading chunk/i, message: "Uploading your project..." },
  { pattern: /Finalizing upload/i, message: "Upload complete, starting analysis..." },

  // Server sandbox & upload phase
  { pattern: /Validating workspace/i, message: "Setting things up..." },
  { pattern: /Creating sandbox/i, message: "Setting things up..." },
  { pattern: /Uploading.*files/i, message: "Uploading your project..." },
  { pattern: /Writing git diff/i, message: "Preparing your changes for review..." },
  { pattern: /Preparing analysis/i, message: "Getting ready to analyze..." },

  // Claude installation & analysis phase
  { pattern: /Checking Claude|Installing Claude/i, message: "Getting ready to analyze..." },
  { pattern: /Setting up.*user|non-root/i, message: "Getting ready to analyze..." },
  { pattern: /Starting Claude/i, message: "Running a detailed analysis of your changes..." },
  { pattern: /Claude is analyzing/i, message: "Analyzing your changes..." },
  { pattern: /Claude is working/i, message: "Still analyzing..." },
  { pattern: /^Claude:/i, message: "Analyzing your changes..." },
  { pattern: /Analyzing\.\.\. \(\d+s\)/i, message: "Still analyzing..." },
  { pattern: /Claude finished/i, message: "Analysis complete! Building your preview..." },

  // Prototype found
  { pattern: /Prototype ready|Prototype found/i, message: "Analysis complete! Building your preview..." },

  // Deploy phase
  { pattern: /Configuring preview/i, message: "Building your preview..." },
  { pattern: /Installing dependencies/i, message: "Installing dependencies..." },
  { pattern: /Starting dev server/i, message: "Starting your preview..." },
  { pattern: /Waiting for server/i, message: "Starting your preview..." },
  { pattern: /Setting up preview tunnel/i, message: "Setting up your preview link..." },
  { pattern: /Preview tunnel ready/i, message: "Preview link is ready!" },
  { pattern: /Waiting for Vite/i, message: "Almost there..." },
  { pattern: /Preview ready/i, message: "Preview is live!" },
  { pattern: /Preview may still be compiling/i, message: "Almost there..." },

  // Finalization
  { pattern: /Creating InFlight version/i, message: "Creating your InFlight version..." },
  { pattern: /Tracking sandbox/i, message: "Saving your share..." },
  { pattern: /Generating diff summary/i, message: "Summarizing your changes..." },
  { pattern: /Generating review/i, message: "Preparing feedback questions..." },
  { pattern: /^Complete!$/i, message: "All done!" },
  { pattern: /Share complete/i, message: "All done!" },

  // Clone-specific messages
  { pattern: /Checking repository access/i, message: "Checking repository access..." },
  { pattern: /Cloning repository/i, message: "Cloning your repository..." },
  { pattern: /Setting up project files/i, message: "Setting up your project..." },
  { pattern: /Git clone available/i, message: "Found a faster way to load your project!" },
];

// Percentage-based phase mapping (used as fallback when no content match)
const PHASE_MESSAGES: Array<{ maxPct: number; message: string }> = [
  { maxPct: 5, message: "Preparing your project..." },
  { maxPct: 12, message: "Loading your code..." },
  { maxPct: 42, message: "Uploading your project..." },
  { maxPct: 50, message: "Setting things up..." },
  { maxPct: 55, message: "Getting ready to analyze..." },
  { maxPct: 70, message: "Analyzing your changes..." },
  { maxPct: 80, message: "Building your preview..." },
  { maxPct: 90, message: "Setting up your preview link..." },
  { maxPct: 96, message: "Creating your InFlight version..." },
  { maxPct: 100, message: "Wrapping up..." },
];

let lastFriendlyMessage = "";

/**
 * Convert a raw progress message to a friendly user-facing message.
 * Returns the friendly message, or null if it would be a duplicate of the last message sent.
 */
export function toFriendlyMessage(percentage: number, rawMessage: string): string | null {
  // Try content-based match first
  let friendly: string | undefined;
  for (const matcher of CONTENT_MATCHERS) {
    if (matcher.pattern.test(rawMessage)) {
      friendly = matcher.message;
      break;
    }
  }

  // Fall back to percentage-based phase
  if (!friendly) {
    for (const phase of PHASE_MESSAGES) {
      if (percentage <= phase.maxPct) {
        friendly = phase.message;
        break;
      }
    }
  }

  friendly = friendly || "Working on it...";

  // Deduplicate consecutive identical messages
  if (friendly === lastFriendlyMessage) {
    return null;
  }

  lastFriendlyMessage = friendly;
  return friendly;
}

/**
 * Reset the deduplication state (call at start of each share operation)
 */
export function resetMessageState(): void {
  lastFriendlyMessage = "";
}
