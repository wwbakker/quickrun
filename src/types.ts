export interface QuickCommand {
  id: string;
  title: string;
  command: string;
  when: string | string[];
  description?: string;
  tags?: string[];
}

export interface QuickrunConfig {
  commands: QuickCommand[];
}

/**
 * Small helper to keep the config API ergonomic while preserving strong typing.
 */
export function defineCommands(commands: readonly QuickCommand[]): QuickCommand[] {
  return [...commands];
}
