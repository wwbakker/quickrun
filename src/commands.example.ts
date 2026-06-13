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
      id: "example-dev",
      title: "Start app dev server",
      command: "bun run dev",
      when: ["~/projects/example-app", "~/projects/example-app/**"],
      description: "Run the local development server for the example app.",
      tags: ["bun", "dev", "example"],
    },
    {
      id: "example-test",
      title: "Run app tests",
      command: "bun test",
      when: ["~/projects/example-app", "~/projects/example-app/**"],
      description: "Execute the example app test suite.",
      tags: ["bun", "test", "example"],
    },
    {
      id: "example-typecheck",
      title: "Type-check TypeScript",
      command: "tsc --noEmit",
      when: ["~/projects/**", "~/workspaces/**"],
      description: "Run a TypeScript type-check in repositories that use TS tooling.",
      tags: ["typescript", "check"],
    },
  ]),
});
