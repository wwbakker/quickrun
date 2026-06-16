import { defineCommands, defineQuickrunConfig, type QuickrunConfig } from "./types.ts";

/**
 * Checked-in example command registry.
 *
 * Keep this file in Git so the project has sensible defaults and a concrete
 * example of the configuration shape without containing user-specific paths.
 */
export const quickrunExampleConfig: QuickrunConfig = defineQuickrunConfig({
  commands: defineCommands([
    {
      title: "Start app dev server",
      command: "bun run dev",
      when: ["~/Repos/example-app", "~/Repos/example-app/**"],
      tags: ["frontend", "local"],
    },
    {
      title: "Run app tests",
      command: "bun test",
      when: ["~/Repos/example-app", "~/Repos/example-app/**"],
      tags: ["qa"],
    },
    {
      title: "Type-check TypeScript",
      command: "tsc --noEmit",
      when: ["~/Repos/**", "~/work/**"],
      tags: ["ts", "types"],
    },
  ]),
});
