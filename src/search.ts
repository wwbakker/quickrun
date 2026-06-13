import type { QuickCommand } from "./types.ts";

function buildSearchHaystack(command: QuickCommand): string {
  return [command.title, command.command, command.description ?? "", ...(command.tags ?? [])]
    .join(" ")
    .toLocaleLowerCase();
}

/**
 * Phase 1 keeps search intentionally small and predictable so UI work can build on it.
 */
export function filterCommandsByQuery(commands: readonly QuickCommand[], query: string): QuickCommand[] {
  const normalizedQuery: string = query.trim().toLocaleLowerCase();

  if (normalizedQuery.length === 0) {
    return [...commands];
  }

  return commands.filter((command: QuickCommand) => buildSearchHaystack(command).includes(normalizedQuery));
}
