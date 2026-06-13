import { describe, expect, test } from "bun:test";

import {
  commandMatchesCwd,
  expandHomeDirectory,
  filterCommandsForCwd,
  getCommandPatterns,
  matchesCwdPattern,
  normalizeGlobPattern,
  normalizePath,
} from "../src/match.ts";
import type { QuickCommand } from "../src/types.ts";

describe("phase 3 cwd matching", () => {
  test("expands the home-directory marker in config patterns", () => {
    expect(expandHomeDirectory("~/Repos/demo", "/Users/tester")).toBe("/Users/tester/Repos/demo");
    expect(expandHomeDirectory("~", "/Users/tester")).toBe("/Users/tester");
  });

  test("normalizes paths and patterns to absolute forward-slash paths", () => {
    expect(normalizePath("~/Repos/demo", "/Users/tester")).toBe("/Users/tester/Repos/demo");
    expect(normalizeGlobPattern("~/Repos/demo/**", "/Users/tester")).toBe("/Users/tester/Repos/demo/**");
  });

  test("matches exact project paths", () => {
    expect(matchesCwdPattern("/Users/tester/Repos/personal/quickrun-ts", "/Users/tester/Repos/personal/quickrun-ts")).toBeTrue();
  });

  test("matches nested directories inside a project", () => {
    expect(matchesCwdPattern("/Users/tester/Repos/personal/quickrun-ts/src/components", "/Users/tester/Repos/personal/quickrun-ts/**")).toBeTrue();
  });

  test("uses any-glob semantics for command visibility", () => {
    const command: QuickCommand = {
      id: "multi-scope",
      title: "Run scoped command",
      command: "bun test",
      when: ["/Users/tester/Repos/work/**", "/Users/tester/Repos/personal/quickrun-ts/**"],
    };

    expect(commandMatchesCwd(command, "/Users/tester/Repos/personal/quickrun-ts/src")).toBeTrue();
    expect(commandMatchesCwd(command, "/Users/tester/Repos/other/project")).toBeFalse();
  });

  test("filters out commands that do not match the cwd", () => {
    const commands: QuickCommand[] = [
      {
        id: "personal",
        title: "Personal command",
        command: "bun test",
        when: "/Users/tester/Repos/personal/**",
      },
      {
        id: "work",
        title: "Work command",
        command: "bun run dev",
        when: "/Users/tester/Repos/work/**",
      },
    ];

    const visibleCommands: QuickCommand[] = filterCommandsForCwd(commands, "/Users/tester/Repos/personal/quickrun-ts");
    expect(visibleCommands.map((command: QuickCommand) => command.id)).toEqual(["personal"]);
  });

  test("returns patterns consistently from single or multiple when values", () => {
    const singlePatternCommand: QuickCommand = {
      id: "single",
      title: "Single",
      command: "echo single",
      when: "/Users/tester/project",
    };

    const multiPatternCommand: QuickCommand = {
      id: "multi",
      title: "Multi",
      command: "echo multi",
      when: ["/Users/tester/project", "/Users/tester/project/**"],
    };

    expect(getCommandPatterns(singlePatternCommand)).toEqual(["/Users/tester/project"]);
    expect(getCommandPatterns(multiPatternCommand)).toEqual(["/Users/tester/project", "/Users/tester/project/**"]);
  });

  test("documents case-sensitive normalized matching behavior", () => {
    const normalizedPattern: string = normalizeGlobPattern("/Users/tester/Repos/**");
    const normalizedCwd: string = normalizePath("/Users/tester/Repos/project");

    expect(normalizedPattern).toBe("/Users/tester/Repos/**");
    expect(normalizedCwd).toBe("/Users/tester/Repos/project");
    expect(matchesCwdPattern("/Users/tester/Repos/project", "/Users/tester/Repos/**")).toBeTrue();
    expect(matchesCwdPattern("/Users/tester/repos/project", "/Users/tester/Repos/**")).toBeFalse();
  });
});
