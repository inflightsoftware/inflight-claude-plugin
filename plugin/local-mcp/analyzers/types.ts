/**
 * Types for the dependency analyzer.
 *
 * The analyzer builds a dependency graph from changed files to determine
 * what files need to be included in a partial share prototype.
 */

export interface DependencyAnalysisResult {
  /** Files changed in the git diff */
  changedFiles: ChangedFile[];

  /** Complete dependency information */
  dependencies: {
    /** All local files needed (recursively resolved) - paths relative to project root */
    localFiles: string[];

    /** NPM packages referenced */
    npmPackages: NpmPackage[];

    /** Workspace packages (@inflight/* or similar) */
    workspacePackages: WorkspacePackage[];
  };

  /** Metadata about the analysis */
  metadata: {
    projectRoot: string;
    entryPoints: string[];
    analysisTimeMs: number;
    pathAliases: Record<string, string>;
  };
}

export interface ChangedFile {
  /** Relative path from project root */
  path: string;
  /** Type of change */
  changeType: "added" | "modified" | "deleted";
  /** Whether the file is UI-relevant (.tsx/.jsx in components/app/pages) */
  isUIRelevant: boolean;
}

export interface NpmPackage {
  /** Package name (e.g., 'react', 'framer-motion') */
  name: string;
  /** Named imports used from this package */
  specifiers: string[];
}

export interface WorkspacePackage {
  /** Package name (e.g., '@inflight/shared') */
  name: string;
  /** Resolved path in monorepo (e.g., 'packages/shared') */
  resolvedPath: string | null;
  /** Files imported from this package */
  importedFiles: string[];
}

export interface AnalyzeDependenciesArgs {
  /** Absolute path to the project root */
  projectPath: string;
  /** Changed file paths (relative to project root). If not provided, detected from git diff */
  changedFiles?: string[];
  /** Base branch to diff against (default: main or master) */
  baseBranch?: string;
}
