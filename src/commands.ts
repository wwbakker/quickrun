import { defineCommands, type QuickCommand, type QuickrunConfig } from "./types.ts";

/**
 * V1 keeps the global command registry in application code as a plain TypeScript module.
 * This keeps configuration simple while we validate the UX and CLI contract.
 */
export const commands: QuickCommand[] = defineCommands([
  {
    id: "quickrun-dev",
    title: "Start Bun in watch mode",
    command: "bun --watch index.ts",
    when: ["~/Repos/personal/quickrun-ts", "~/Repos/personal/quickrun-ts/**"],
    description: "Run the local quickrun development entrypoint.",
    tags: ["bun", "dev", "quickrun"],
  },
  {
    id: "quickrun-test",
    title: "Run the test suite",
    command: "bun test",
    when: ["~/Repos/personal/quickrun-ts", "~/Repos/personal/quickrun-ts/**"],
    description: "Execute the full Bun test suite for this repository.",
    tags: ["bun", "test", "quickrun"],
  },
  {
    id: "typescript-check",
    title: "Type-check TypeScript",
    command: "tsc --noEmit",
    when: ["~/Repos/**", "~/work/**"],
    description: "Run a TypeScript type-check in repositories that use TS tooling.",
    tags: ["typescript", "check"],
  },
]);

export const quickrunConfig: QuickrunConfig = {
  commands,
};
