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
      when: ["~/projects/example-app", "~/projects/example-app/**"],
      tags: ["frontend", "local"],
    },
    {
      title: "Run app tests",
      command: "bun test",
      when: ["~/projects/example-app", "~/projects/example-app/**"],
      tags: ["qa"],
    },
    {
      title: "Type-check TypeScript",
      command: "tsc --noEmit",
      when: ["~/projects/**", "~/workspaces/**"],
      tags: ["ts", "types"],
    },
  ]),
});
