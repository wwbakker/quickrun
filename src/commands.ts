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

async function loadLocalCommands(): Promise<QuickEntry[] | null> {
  const localCommandsUrl: URL = new URL("./commands.local.ts", import.meta.url);
  if (!(await Bun.file(localCommandsUrl).exists())) {
    return null;
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
 * If `src/commands.local.ts` exists, it fully replaces the example registry.
 * The checked-in example config is only used when no local config file exists.
 */
const localCommands: QuickEntry[] | null = await loadLocalCommands();
const configuredCommands: QuickEntry[] = localCommands ?? quickrunExampleConfig.commands;

export const quickrunConfig: QuickrunConfig = defineQuickrunConfig({
  commands: defineCommands(configuredCommands),
});

export const commands: QuickEntry[] = quickrunConfig.commands;
