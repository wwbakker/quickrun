import { describe, expect, test } from "bun:test";

import { filterCommandsByQuery, normalizeSearchQuery, scoreCommandForQuery } from "../src/search.ts";
import type { QuickCommand } from "../src/types.ts";

const commands: QuickCommand[] = [
  {
    title: "Dev server",
    command: "bun run dev",
    when: "**",
    tags: ["frontend", "local"],
  },
  {
    title: "Start app",
    command: "bun run dev:api",
    when: "**",
    tags: ["backend"],
  },
  {
    title: "Run tests",
    command: "bun test",
    when: "**",
    tags: ["qa", "checks"],
  },
  {
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
    expect(filterCommandsByQuery(commands, "").map((command: QuickCommand) => command.title)).toEqual([
      "Dev server",
      "Start app",
      "Run tests",
      "Build release",
    ]);
  });

  test("searches across title, command, and tags", () => {
    expect(filterCommandsByQuery(commands, "dev").map((command: QuickCommand) => command.title)).toEqual([
      "Dev server",
      "Start app",
    ]);

    expect(filterCommandsByQuery(commands, "production").map((command: QuickCommand) => command.title)).toEqual([
      "Build release",
    ]);

    expect(filterCommandsByQuery(commands, "checks").map((command: QuickCommand) => command.title)).toEqual([
      "Run tests",
    ]);
  });

  test("ranks stronger title matches above command and tag matches", () => {
    const rankedCommands: string[] = filterCommandsByQuery(commands, "dev").map((command: QuickCommand) => command.title);
    expect(rankedCommands).toEqual(["Dev server", "Start app"]);

    expect(scoreCommandForQuery(commands[0]!, "dev")).toBeGreaterThan(scoreCommandForQuery(commands[1]!, "dev") ?? 0);
  });

  test("returns no results when nothing matches", () => {
    expect(filterCommandsByQuery(commands, "gibberish")).toEqual([]);
    expect(scoreCommandForQuery(commands[0]!, "gibberish")).toBeNull();
  });
});
