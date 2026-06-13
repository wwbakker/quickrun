export interface QuickCommand {
  title: string;
  command: string;
  when: string | string[];
  tags?: string[];
}

export interface QuickrunConfig {
  commands: QuickCommand[];
}

/**
 * Small helper to keep per-command configuration ergonomic while preserving strong typing.
 */
export function defineCommands(commands: readonly QuickCommand[]): QuickCommand[] {
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
