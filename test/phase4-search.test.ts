import { describe, expect, test } from "bun:test";

import { filterCommandsByQuery, normalizeSearchQuery, scoreCommandForQuery } from "../src/search.ts";
import type { QuickCommand } from "../src/types.ts";

const commands: QuickCommand[] = [
  {
    id: "dev-title",
    title: "Dev server",
    command: "bun run dev",
    when: "**",
    description: "Start the local development server.",
    tags: ["frontend", "dev"],
  },
  {
    id: "command-hit",
    title: "Start app",
    command: "bun run dev:api",
    when: "**",
    description: "Run the API server.",
    tags: ["backend"],
  },
  {
    id: "description-hit",
    title: "Run tests",
    command: "bun test",
    when: "**",
    description: "Useful during development iterations.",
    tags: ["qa"],
  },
  {
    id: "tag-hit",
    title: "Build release",
    command: "bun run build",
    when: "**",
    tags: ["deploy", "production"],
  },
];

describe("phase 4 search and ranking", () => {
  test("normalizes queries case-insensitively", () => {
    expect(normalizeSearchQuery("  DEV  ")).toBe("dev");
  });

  test("returns all commands for an empty query in original order", () => {
    expect(filterCommandsByQuery(commands, "").map((command: QuickCommand) => command.id)).toEqual([
      "dev-title",
      "command-hit",
      "description-hit",
      "tag-hit",
    ]);
  });

  test("searches across title, command, description, and tags", () => {
    expect(filterCommandsByQuery(commands, "dev").map((command: QuickCommand) => command.id)).toEqual([
      "dev-title",
      "command-hit",
      "description-hit",
    ]);

    expect(filterCommandsByQuery(commands, "production").map((command: QuickCommand) => command.id)).toEqual(["tag-hit"]);
  });

  test("ranks stronger title matches above command, tag, and description matches", () => {
    const rankedCommands: string[] = filterCommandsByQuery(commands, "dev").map((command: QuickCommand) => command.id);
    expect(rankedCommands).toEqual(["dev-title", "command-hit", "description-hit"]);

    expect(scoreCommandForQuery(commands[0]!, "dev")).toBeGreaterThan(scoreCommandForQuery(commands[1]!, "dev") ?? 0);
    expect(scoreCommandForQuery(commands[1]!, "dev")).toBeGreaterThan(scoreCommandForQuery(commands[2]!, "dev") ?? 0);
  });

  test("returns no results when nothing matches", () => {
    expect(filterCommandsByQuery(commands, "gibberish")).toEqual([]);
    expect(scoreCommandForQuery(commands[0]!, "gibberish")).toBeNull();
  });
});
