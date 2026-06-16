import { describe, expect, test } from "bun:test";

import { commands, quickrunConfig } from "../src/commands.ts";
import { quickrunExampleConfig } from "../src/commands.example.ts";
import { isQuickGroup } from "../src/types.ts";

describe("phase 2 command config", () => {
  test("exposes the example registry through the global config object", () => {
    expect(quickrunConfig.commands).toEqual(commands);
    expect(quickrunConfig.commands.length).toBeGreaterThan(0);
    expect(quickrunConfig.commands.slice(0, quickrunExampleConfig.commands.length)).toEqual(quickrunExampleConfig.commands);
  });

  test("supports required and optional command fields", () => {
    const command = commands[0];

    expect(command).toBeDefined();
    expect(command?.title).toBeString();
    expect(command?.when).toBeDefined();
    expect(command?.tags).toBeArray();
    expect(isQuickGroup(command!)).toBeFalse();
    expect(isQuickGroup(command!) ? undefined : command?.command).toBeString();
  });

  test("supports groups with nested commands", () => {
    const group = commands.find((command) => isQuickGroup(command));

    expect(group).toBeDefined();
    expect(group?.title).toBeString();
    expect(group?.when).toBeDefined();
    expect(group?.tags).toBeArray();
    expect(isQuickGroup(group!)).toBeTrue();
    expect(isQuickGroup(group!) ? group.commands.length : 0).toBeGreaterThan(0);
  });

  test("supports multiple cwd globs per command and covers multiple project patterns", () => {
    const commandsWithMultipleGlobs = commands.filter((command) => Array.isArray(command.when) && command.when.length > 1);
    expect(commandsWithMultipleGlobs.length).toBeGreaterThan(0);

    const allPatterns = commands.flatMap((command) => (Array.isArray(command.when) ? command.when : [command.when]));
    expect(allPatterns).toContain("~/Repos/**");
    expect(allPatterns).toContain("~/work/**");
  });
});
