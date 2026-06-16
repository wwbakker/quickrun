interface SearchableEntry {
  title: string;
  tags?: string[];
  command?: string;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function splitNormalizedSearchQuery(normalizedQuery: string): string[] {
  return normalizedQuery.length === 0 ? [] : normalizedQuery.split(" ");
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

function buildSearchHaystack(command: SearchableEntry): string {
  return [command.title, command.command ?? "", ...(command.tags ?? [])].join(" ").toLocaleLowerCase();
}

function scoreCommandForTerm(command: SearchableEntry, haystack: string, term: string): number | null {
  if (!haystack.includes(term)) {
    return null;
  }

  let score: number = 0;

  if (command.title.toLocaleLowerCase() === term) {
    score = Math.max(score, 1_000);
  } else if (fieldStartsWith(command.title, term)) {
    score = Math.max(score, 900);
  } else if (fieldHasWordPrefix(command.title, term)) {
    score = Math.max(score, 850);
  } else if (fieldIncludes(command.title, term)) {
    score = Math.max(score, 800);
  }

  if (command.command !== undefined) {
    if (fieldStartsWith(command.command, term)) {
      score = Math.max(score, 700);
    } else if (fieldIncludes(command.command, term)) {
      score = Math.max(score, 650);
    }
  }

  for (const tag of command.tags ?? []) {
    if (tag.toLocaleLowerCase() === term) {
      score = Math.max(score, 600);
      break;
    }

    if (fieldStartsWith(tag, term)) {
      score = Math.max(score, 550);
      break;
    }

    if (fieldIncludes(tag, term)) {
      score = Math.max(score, 500);
      break;
    }
  }

  return score;
}

/**
 * Lightweight ranking tuned for predictable terminal search results.
 * Higher scores rank earlier; `null` means "no match".
 */
export function scoreCommandForQuery<T extends SearchableEntry>(command: T, query: string): number | null {
  const normalizedQuery: string = normalizeSearchQuery(query);
  const queryTerms: string[] = splitNormalizedSearchQuery(normalizedQuery);

  if (queryTerms.length === 0) {
    return 0;
  }

  const haystack: string = buildSearchHaystack(command);

  if (queryTerms.length === 1) {
    return scoreCommandForTerm(command, haystack, queryTerms[0]!);
  }

  let score: number = 0;

  for (const queryTerm of queryTerms) {
    const termScore: number | null = scoreCommandForTerm(command, haystack, queryTerm);
    if (termScore === null) {
      return null;
    }

    score += termScore;
  }

  if (haystack.includes(normalizedQuery)) {
    score += 100;
  }

  return score;
}

/**
 * Search stays intentionally small and predictable so the terminal UI remains easy to reason about.
 */
export function filterCommandsByQuery<T extends SearchableEntry>(commands: readonly T[], query: string): T[] {
  const normalizedQuery: string = normalizeSearchQuery(query);

  if (normalizedQuery.length === 0) {
    return [...commands];
  }

  return commands
    .map((command: T, index: number) => {
      const score: number | null = scoreCommandForQuery(command, normalizedQuery);
      return score === null ? null : { command, score, index };
    })
    .filter((match): match is { command: T; score: number; index: number } => match !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((match) => match.command);
}
