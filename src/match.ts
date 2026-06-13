import os from "node:os";
import path from "node:path";

import type { QuickCommand } from "./types.ts";

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

/**
 * Normalize file-system paths before later matching/ranking logic is applied.
 */
export function normalizePath(inputPath: string): string {
  return path.resolve(expandHomeDirectory(inputPath));
}

export function getCommandPatterns(command: QuickCommand): string[] {
  return Array.isArray(command.when) ? [...command.when] : [command.when];
}
