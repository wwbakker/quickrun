import type { QuickCommand } from "./types.ts";

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function fieldIncludes(field: string, query: string): boolean {
  return field.toLocaleLowerCase().includes(query);
}

function fieldStartsWith(field: string, query: string): boolean {
  return field.toLocaleLowerCase().startsWith(query);
}

function fieldHasWordPrefix(field: string, query: string): boolean {
  return field
    .toLocaleLowerCase()
    .split(/\s+/)
    .some((word: string) => word.startsWith(query));
}

function buildSearchHaystack(command: QuickCommand): string {
  return [command.title, command.command, ...(command.tags ?? [])].join(" ").toLocaleLowerCase();
}

/**
 * Lightweight ranking tuned for predictable terminal search results.
 * Higher scores rank earlier; `null` means "no match".
 */
export function scoreCommandForQuery(command: QuickCommand, query: string): number | null {
  const normalizedQuery: string = normalizeSearchQuery(query);

  if (normalizedQuery.length === 0) {
    return 0;
  }

  const haystack: string = buildSearchHaystack(command);
  if (!haystack.includes(normalizedQuery)) {
    return null;
  }

  let score: number = 0;

  if (command.title.toLocaleLowerCase() === normalizedQuery) {
    score = Math.max(score, 1_000);
  } else if (fieldStartsWith(command.title, normalizedQuery)) {
    score = Math.max(score, 900);
  } else if (fieldHasWordPrefix(command.title, normalizedQuery)) {
    score = Math.max(score, 850);
  } else if (fieldIncludes(command.title, normalizedQuery)) {
    score = Math.max(score, 800);
  }

  if (fieldStartsWith(command.command, normalizedQuery)) {
    score = Math.max(score, 700);
  } else if (fieldIncludes(command.command, normalizedQuery)) {
    score = Math.max(score, 650);
  }

  for (const tag of command.tags ?? []) {
    if (tag.toLocaleLowerCase() === normalizedQuery) {
      score = Math.max(score, 600);
      break;
    }

    if (fieldStartsWith(tag, normalizedQuery)) {
      score = Math.max(score, 550);
      break;
    }

    if (fieldIncludes(tag, normalizedQuery)) {
      score = Math.max(score, 500);
      break;
    }
  }

  return score;
}

/**
 * Search stays intentionally small and predictable so the terminal UI remains easy to reason about.
 */
export function filterCommandsByQuery(commands: readonly QuickCommand[], query: string): QuickCommand[] {
  const normalizedQuery: string = normalizeSearchQuery(query);

  if (normalizedQuery.length === 0) {
    return [...commands];
  }

  return commands
    .map((command: QuickCommand, index: number) => {
      const score: number | null = scoreCommandForQuery(command, normalizedQuery);
      return score === null ? null : { command, score, index };
    })
    .filter((match): match is { command: QuickCommand; score: number; index: number } => match !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((match) => match.command);
}
