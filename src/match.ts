import { Glob } from "bun";
import os from "node:os";
import path from "node:path";

interface ScopedEntry {
  when: string | string[];
}

/**
 * Expand a leading home-directory marker so config patterns can use `~` ergonomically.
 */
export function expandHomeDirectory(inputPath: string, homeDirectory: string = os.homedir()): string {
  if (inputPath === "~") {
    return homeDirectory;
  }

  if (inputPath.startsWith("~/")) {
    return path.join(homeDirectory, inputPath.slice(2));
  }

  return inputPath;
}

function normalizePathSeparators(inputPath: string): string {
  return inputPath.replaceAll("\\", "/");
}

function trimTrailingSlash(inputPath: string): string {
  if (inputPath === "/") {
    return inputPath;
  }

  return inputPath.endsWith("/") ? inputPath.slice(0, -1) : inputPath;
}

/**
 * Normalize file-system paths before matching.
 *
 * Matching is case-sensitive and uses normalized absolute paths with forward slashes.
 */
export function normalizePath(inputPath: string, homeDirectory: string = os.homedir()): string {
  const resolvedPath: string = path.resolve(expandHomeDirectory(inputPath, homeDirectory));
  return trimTrailingSlash(normalizePathSeparators(resolvedPath));
}

/**
 * Normalize glob patterns while preserving wildcard segments.
 */
export function normalizeGlobPattern(pattern: string, homeDirectory: string = os.homedir()): string {
  const expandedPattern: string = expandHomeDirectory(pattern, homeDirectory);

  if (expandedPattern === "**") {
    return expandedPattern;
  }

  const resolvedPattern: string = path.isAbsolute(expandedPattern)
    ? path.normalize(expandedPattern)
    : path.resolve(expandedPattern);

  return trimTrailingSlash(normalizePathSeparators(resolvedPattern));
}

export function getCommandPatterns<T extends ScopedEntry>(command: T): string[] {
  return Array.isArray(command.when) ? [...command.when] : [command.when];
}

export function matchesCwdPattern(cwd: string, pattern: string): boolean {
  const normalizedCwd: string = normalizePath(cwd);
  const normalizedPattern: string = normalizeGlobPattern(pattern);
  return new Glob(normalizedPattern).match(normalizedCwd);
}

export function commandMatchesCwd<T extends ScopedEntry>(command: T, cwd: string): boolean {
  return getCommandPatterns(command).some((pattern: string) => matchesCwdPattern(cwd, pattern));
}

export function filterCommandsForCwd<T extends ScopedEntry>(commands: readonly T[], cwd: string): T[] {
  return commands.filter((command: T) => commandMatchesCwd(command, cwd));
}
