export interface QuickAction {
  title: string;
  command: string;
  tags?: string[];
}

export interface QuickCommand extends QuickAction {
  when: string | string[];
}

export interface QuickGroup {
  title: string;
  when: string | string[];
  tags?: string[];
  commands: QuickAction[];
}

export type QuickEntry = QuickCommand | QuickGroup;

export interface QuickrunConfig {
  commands: QuickEntry[];
}

export function isQuickGroup(entry: QuickEntry | QuickAction): entry is QuickGroup {
  return "commands" in entry;
}

/**
 * Small helper to keep top-level command and group configuration ergonomic while preserving strong typing.
 */
export function defineCommands(commands: readonly QuickEntry[]): QuickEntry[] {
  return [...commands];
}

/**
 * Helper for defining the global quickrun config as plain TypeScript.
 */
export function defineQuickrunConfig(config: QuickrunConfig): QuickrunConfig {
  return {
    commands: [...config.commands],
  };
}
