import { defineCommands, defineQuickrunConfig, type QuickEntry, type QuickrunConfig } from "./types.ts";
import { quickrunExampleConfig } from "./commands.example.ts";

interface QuickrunLocalModule {
  localCommands?: QuickEntry[];
  quickrunLocalConfig?: QuickrunConfig;
}

function getLocalCommandsFromModule(module: QuickrunLocalModule): QuickEntry[] {
  if (module.quickrunLocalConfig !== undefined) {
    return defineCommands(module.quickrunLocalConfig.commands);
  }

  if (module.localCommands !== undefined) {
    return defineCommands(module.localCommands);
  }

  return [];
}

async function loadLocalCommands(): Promise<QuickEntry[]> {
  const localCommandsUrl: URL = new URL("./commands.local.ts", import.meta.url);
  if (!(await Bun.file(localCommandsUrl).exists())) {
    return [];
  }

  const localModule: QuickrunLocalModule = (await import(localCommandsUrl.href)) as QuickrunLocalModule;
  return getLocalCommandsFromModule(localModule);
}

/**
 * Global quickrun config loader.
 *
 * - `src/commands.example.ts` is checked in and provides the shared example/defaults.
 * - `src/commands.local.ts` is optional and gitignored for local customization.
 *
 * If `src/commands.local.ts` exists, its commands are appended after the example
 * commands so local entries can extend the default registry without editing tracked files.
 */
const localCommands: QuickEntry[] = await loadLocalCommands();

export const quickrunConfig: QuickrunConfig = defineQuickrunConfig({
  commands: defineCommands([...quickrunExampleConfig.commands, ...localCommands]),
});

export const commands: QuickEntry[] = quickrunConfig.commands;
