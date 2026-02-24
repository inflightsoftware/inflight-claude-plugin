/**
 * Dependency Analyzer
 *
 * Uses esbuild to quickly resolve all imports from changed files and build
 * a complete dependency graph. This enables "fast mode" for partial share
 * by doing deterministic analysis locally instead of in the cloud.
 */

import * as esbuild from "esbuild";
import * as path from "path";
import * as fs from "fs";
import type {
  DependencyAnalysisResult,
  ChangedFile,
  NpmPackage,
  WorkspacePackage,
} from "./types.js";
import { getGitDiff, isGitRepo } from "../utils/git-utils.js";

/**
 * Patterns for identifying UI-relevant files
 * Note: Patterns use (^|\/) to match both paths starting with the directory
 * and paths containing the directory (e.g., "app/page.js" and "src/app/page.js")
 */
const UI_RELEVANT_PATTERNS = [
  /\.(tsx|jsx)$/, // React components (.tsx/.jsx)
  /(^|\/)components\//, // Component directories
  /(^|\/)app\/.*\.(js|jsx|ts|tsx)$/, // Next.js app router (any JS/TS file)
  /(^|\/)pages\/.*\.(js|jsx|ts|tsx)$/, // Next.js pages router (any JS/TS file)
  /\.(css|scss|sass|module\.css)$/, // Stylesheets
];

/**
 * Check if a file is UI-relevant (likely to affect visual output)
 */
function isUIRelevant(filePath: string): boolean {
  return UI_RELEVANT_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Parse changed files from git diff output
 */
function parseChangedFilesFromDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = diff.split("\n");

  for (const line of lines) {
    // Match diff header lines like "diff --git a/path/to/file b/path/to/file"
    const diffMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (diffMatch) {
      const filePath = diffMatch[2];
      // Determine change type from subsequent lines (simplified)
      const changeType: "added" | "modified" | "deleted" = "modified";

      files.push({
        path: filePath,
        changeType,
        isUIRelevant: isUIRelevant(filePath),
      });
    }
  }

  return files;
}

/**
 * Load path aliases from tsconfig.json
 */
function loadPathAliases(projectRoot: string): Record<string, string> {
  const tsconfigPaths = [
    path.join(projectRoot, "tsconfig.json"),
    path.join(projectRoot, "jsconfig.json"),
  ];

  for (const tsconfigPath of tsconfigPaths) {
    if (fs.existsSync(tsconfigPath)) {
      try {
        const content = fs.readFileSync(tsconfigPath, "utf-8");
        // Try to parse directly first (most tsconfigs don't have comments)
        let tsconfig;
        try {
          tsconfig = JSON.parse(content);
        } catch {
          // If that fails, try removing line comments only (// style)
          // Don't remove /* */ as they can appear in glob patterns like "./src/*"
          const cleanContent = content
            .split("\n")
            .map((line) => line.replace(/^\s*\/\/.*$/, ""))
            .join("\n");
          tsconfig = JSON.parse(cleanContent);
        }
        const paths = tsconfig.compilerOptions?.paths || {};

        const aliases: Record<string, string> = {};
        for (const [alias, targets] of Object.entries(paths)) {
          // Convert "@/*" to "@/" for matching, "./*" to "./"
          const cleanAlias = alias.replace("/*", "/");
          const cleanTarget = ((targets as string[])[0] || "").replace(
            "/*",
            "/"
          );
          if (cleanTarget) {
            aliases[cleanAlias] = cleanTarget;
          }
        }
        return aliases;
      } catch {
        // Ignore parse errors
      }
    }
  }

  return {};
}

/**
 * Create an esbuild plugin to track resolved imports
 */
function createAnalysisPlugin(
  projectRoot: string,
  pathAliases: Record<string, string>,
  resolvedFiles: Set<string>,
  npmPackages: Map<string, Set<string>>,
  workspacePackages: Map<
    string,
    { resolvedPath: string | null; imports: Set<string> }
  >
): esbuild.Plugin {
  return {
    name: "dependency-analyzer",
    setup(build: esbuild.PluginBuild) {
      // Handle path aliases (e.g., @/ -> ./src/)
      for (const [alias, target] of Object.entries(pathAliases)) {
        const filter = new RegExp(`^${alias.replace("/", "\\/")}`);
        build.onResolve({ filter }, (args: esbuild.OnResolveArgs) => {
          const resolvedPath = args.path.replace(alias, target);
          const fullPath = path.resolve(projectRoot, resolvedPath);

          // Try to resolve with extensions
          const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
          for (const ext of extensions) {
            const testPath = fullPath + ext;
            if (fs.existsSync(testPath)) {
              const relativePath = path.relative(projectRoot, testPath);
              resolvedFiles.add(relativePath);
              return { path: testPath };
            }
            // Check for index file
            const indexPath = path.join(fullPath, `index${ext || ".ts"}`);
            if (fs.existsSync(indexPath)) {
              const relativePath = path.relative(projectRoot, indexPath);
              resolvedFiles.add(relativePath);
              return { path: indexPath };
            }
          }

          // Mark as external if not found locally
          return { path: args.path, external: true };
        });
      }

      // Handle workspace packages (e.g., @inflight/*)
      build.onResolve({ filter: /^@[^/]+\// }, (args: esbuild.OnResolveArgs) => {
        const packageName = args.path.split("/").slice(0, 2).join("/");

        // Check if it's a workspace package by looking in common locations
        const workspacePaths = [
          path.join(projectRoot, "..", "packages"),
          path.join(projectRoot, "..", "..", "packages"),
          path.join(projectRoot, "packages"),
        ];

        for (const wsPath of workspacePaths) {
          const pkgName = packageName.split("/")[1];
          const pkgPath = path.join(wsPath, pkgName);
          if (fs.existsSync(pkgPath)) {
            const existing = workspacePackages.get(packageName) || {
              resolvedPath: path.relative(projectRoot, pkgPath),
              imports: new Set<string>(),
            };
            existing.imports.add(args.path);
            workspacePackages.set(packageName, existing);
            return { path: args.path, external: true };
          }
        }

        // It's an npm package
        const existing = npmPackages.get(packageName) || new Set<string>();
        // Extract the specific import
        const subpath = args.path.slice(packageName.length + 1);
        existing.add(subpath || "default");
        npmPackages.set(packageName, existing);

        return { path: args.path, external: true };
      });

      // Handle bare npm packages (e.g., react, framer-motion)
      build.onResolve({ filter: /^[^.@/]/ }, (args: esbuild.OnResolveArgs) => {
        const packageName = args.path.split("/")[0];
        const existing = npmPackages.get(packageName) || new Set<string>();
        const subpath = args.path.slice(packageName.length + 1);
        existing.add(subpath || "default");
        npmPackages.set(packageName, existing);

        return { path: args.path, external: true };
      });

      // Handle relative imports
      build.onResolve({ filter: /^\./ }, (args: esbuild.OnResolveArgs) => {
        const resolvedPath = path.resolve(
          path.dirname(args.importer),
          args.path
        );

        // Try to resolve with extensions
        const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
        for (const ext of extensions) {
          const testPath = resolvedPath + ext;
          if (fs.existsSync(testPath)) {
            const relativePath = path.relative(projectRoot, testPath);
            resolvedFiles.add(relativePath);
            return { path: testPath };
          }
          // Check for index file
          const indexPath = path.join(resolvedPath, `index${ext || ".ts"}`);
          if (fs.existsSync(indexPath)) {
            const relativePath = path.relative(projectRoot, indexPath);
            resolvedFiles.add(relativePath);
            return { path: indexPath };
          }
        }

        // If not found, mark as external
        return { path: args.path, external: true };
      });

      // Track all loaded files
      build.onLoad(
        { filter: /\.(ts|tsx|js|jsx)$/ },
        async (args: esbuild.OnLoadArgs) => {
          const relativePath = path.relative(projectRoot, args.path);
          resolvedFiles.add(relativePath);

          // Return the actual content for parsing
          const content = await fs.promises.readFile(args.path, "utf-8");
          return {
            contents: content,
            loader: args.path.endsWith(".tsx")
              ? "tsx"
              : args.path.endsWith(".ts")
                ? "ts"
                : args.path.endsWith(".jsx")
                  ? "jsx"
                  : "js",
          };
        }
      );
    },
  };
}

/**
 * Analyze dependencies for the given entry points using esbuild
 */
export async function analyzeDependencies(
  projectRoot: string,
  entryPoints: string[],
  pathAliases: Record<string, string>
): Promise<{
  localFiles: string[];
  npmPackages: NpmPackage[];
  workspacePackages: WorkspacePackage[];
}> {
  const resolvedFiles = new Set<string>();
  const npmPackages = new Map<string, Set<string>>();
  const workspacePackages = new Map<
    string,
    { resolvedPath: string | null; imports: Set<string> }
  >();

  // Add entry points to resolved files
  for (const entry of entryPoints) {
    resolvedFiles.add(entry);
  }

  const absoluteEntryPoints = entryPoints.map((e) =>
    path.resolve(projectRoot, e)
  );

  try {
    await esbuild.build({
      entryPoints: absoluteEntryPoints,
      bundle: true,
      write: false,
      platform: "browser",
      format: "esm",
      logLevel: "silent",
      plugins: [
        createAnalysisPlugin(
          projectRoot,
          pathAliases,
          resolvedFiles,
          npmPackages,
          workspacePackages
        ),
      ],
    });
  } catch {
    // esbuild might fail on some files, but we still collect what we can
    // This is expected for partial analysis
  }

  return {
    localFiles: Array.from(resolvedFiles).sort(),
    npmPackages: Array.from(npmPackages.entries()).map(([name, specifiers]) => ({
      name,
      specifiers: Array.from(specifiers),
    })),
    workspacePackages: Array.from(workspacePackages.entries()).map(
      ([name, data]) => ({
        name,
        resolvedPath: data.resolvedPath,
        importedFiles: Array.from(data.imports),
      })
    ),
  };
}

/**
 * Main entry point: analyze dependencies for a project
 */
export async function analyzeProjectDependencies(
  projectPath: string,
  changedFiles?: string[],
  baseBranch?: string
): Promise<DependencyAnalysisResult> {
  const startTime = Date.now();
  const projectRoot = path.resolve(projectPath);

  // Load path aliases
  const pathAliases = loadPathAliases(projectRoot);

  // Get changed files from git if not provided
  let files: ChangedFile[];
  if (changedFiles && changedFiles.length > 0) {
    files = changedFiles.map((f) => ({
      path: f,
      changeType: "modified" as const,
      isUIRelevant: isUIRelevant(f),
    }));
  } else if (isGitRepo(projectRoot)) {
    const diffResult = getGitDiff(projectRoot, 500000, baseBranch);
    if (diffResult) {
      files = parseChangedFilesFromDiff(diffResult.diff);
    } else {
      files = [];
    }
  } else {
    files = [];
  }

  // Filter to UI-relevant files as entry points
  const entryPoints = files
    .filter((f) => f.isUIRelevant && f.changeType !== "deleted")
    .map((f) => f.path);

  if (entryPoints.length === 0) {
    return {
      changedFiles: files,
      dependencies: {
        localFiles: [],
        npmPackages: [],
        workspacePackages: [],
      },
      metadata: {
        projectRoot,
        entryPoints: [],
        analysisTimeMs: Date.now() - startTime,
        pathAliases,
      },
    };
  }

  // Analyze dependencies
  const dependencies = await analyzeDependencies(
    projectRoot,
    entryPoints,
    pathAliases
  );

  return {
    changedFiles: files,
    dependencies,
    metadata: {
      projectRoot,
      entryPoints,
      analysisTimeMs: Date.now() - startTime,
      pathAliases,
    },
  };
}
