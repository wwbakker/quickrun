import { describe, expect, test } from "bun:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import { QuickrunSelector } from "../src/selector.ts";
import type { QuickAction, QuickEntry } from "../src/types.ts";

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replaceAll(ANSI_PATTERN, "");
}

const commands: QuickEntry[] = [
  {
    title: "Dev server",
    command: "bun run dev",
    when: "**",
    tags: ["frontend", "local"],
  },
  {
    title: "Run tests",
    command: "bun test",
    when: "**",
    tags: ["qa", "checks"],
  },
  {
    title: "cd",
    when: "**",
    tags: ["directories"],
    commands: [
      {
        title: "Repos",
        command: "cd ~/Repos",
        tags: ["root"],
      },
      {
        title: "Downloads",
        command: "cd ~/Downloads",
        tags: ["files"],
      },
    ],
  },
  {
    title: "Build app",
    command: "bun run build",
    when: "**",
    tags: ["release", "deploy"],
  },
];

function createSelector(overrides?: Partial<{ commands: QuickEntry[] }>): {
  selector: QuickrunSelector;
  selectedCommands: QuickAction[];
  cancelCount: number;
  renderCount: number;
} {
  const selectedCommands: QuickAction[] = [];
  let cancelCount: number = 0;
  let renderCount: number = 0;

  const selector: QuickrunSelector = new QuickrunSelector({
    cwd: "/Users/tester/Repos/personal/quickrun-ts",
    commands: overrides?.commands ?? commands,
    onSelect: (command: QuickAction) => {
      selectedCommands.push(command);
    },
    onCancel: () => {
      cancelCount += 1;
    },
    requestRender: () => {
      renderCount += 1;
    },
  });

  return {
    selector,
    selectedCommands,
    get cancelCount(): number {
      return cancelCount;
    },
    get renderCount(): number {
      return renderCount;
    },
  };
}

describe("phase 5 selector UI", () => {
  test("renders compact aligned one-line command options", () => {
    const { selector } = createSelector();
    const lines: string[] = selector.render(120);
    const plainLines: string[] = lines.map(stripAnsi);

    expect((plainLines[0] ?? "").startsWith("Dev server  bun run dev")).toBeTrue();
    expect(plainLines[1] ?? "").toBe("Run tests   bun test");
    expect(plainLines[2] ?? "").toBe("cd          open group");
    expect(plainLines[3] ?? "").toBe("Build app   bun run build");
    expect(lines[0] ?? "").toContain("\x1b[107m");
    expect(lines[0] ?? "").toContain("\x1b[30mDev server");
    expect(lines[0] ?? "").toContain("\x1b[90mbun run dev");
    expect(lines[1] ?? "").toContain("\x1b[97mRun tests ");
    expect(lines[1] ?? "").toContain("\x1b[90mbun test");
    expect(visibleWidth(lines[0] ?? "")).toBe(120);
  });

  test("filters results as the user types", () => {
    const harness = createSelector();
    harness.selector.handleInput("d");
    harness.selector.handleInput("e");
    harness.selector.handleInput("v");

    const plainOutput: string = harness.selector.render(120).map(stripAnsi).join("\n");
    expect(plainOutput).toContain("Dev server  bun run dev");
    expect(plainOutput).not.toContain("Run tests");
    expect(harness.renderCount).toBeGreaterThan(0);
  });

  test("supports keyboard navigation and selection on Enter", () => {
    const { selector, selectedCommands } = createSelector();
    selector.handleInput("\u001b[B");

    const lines: string[] = selector.render(120);
    const plainOutput: string = lines.map(stripAnsi).join("\n");
    expect(plainOutput).toContain("Run tests   bun test");
    expect((lines[1] ?? "")).toContain("\x1b[107m");
    expect((lines[0] ?? "")).not.toContain("\x1b[107m");
    expect(visibleWidth(lines[1] ?? "")).toBe(120);

    selector.handleInput("\r");
    expect(selectedCommands.map((command: QuickAction) => command.title)).toEqual(["Run tests"]);
  });

  test("opens groups and selects commands inside them", () => {
    const { selector, selectedCommands } = createSelector();
    selector.handleInput("\u001b[B");
    selector.handleInput("\u001b[B");
    selector.handleInput("\r");

    const groupOutput: string = stripAnsi(selector.render(120).join("\n"));
    expect(groupOutput).toContain("cd/");
    expect(groupOutput).toContain("Repos      cd ~/Repos");
    expect(groupOutput).toContain("Downloads  cd ~/Downloads");

    selector.handleInput("\u001b[B");
    selector.handleInput("\r");

    expect(selectedCommands.map((command: QuickAction) => command.title)).toEqual(["Downloads"]);
  });

  test("backspace on an empty query leaves the current group", () => {
    const { selector } = createSelector();
    selector.handleInput("\u001b[B");
    selector.handleInput("\u001b[B");
    selector.handleInput("\r");

    expect(stripAnsi(selector.render(120).join("\n"))).toContain("cd/");

    selector.handleInput("\u007f");

    const rootOutput: string = stripAnsi(selector.render(120).join("\n"));
    expect(rootOutput).toContain("cd          open group");
    expect(rootOutput).not.toContain("cd/");
  });

  test("clamps the selected row when filtering shrinks the result set", () => {
    const { selector, selectedCommands } = createSelector();
    selector.handleInput("\u001b[B");
    selector.handleInput("\u001b[B");
    selector.handleInput("\u001b[B");
    selector.handleInput("t");
    selector.handleInput("e");
    selector.handleInput("s");
    selector.handleInput("t");
    selector.handleInput("\r");

    expect(selectedCommands.map((command: QuickAction) => command.title)).toEqual(["Run tests"]);
  });

  test("shows a no-results state and lets Backspace recover", () => {
    const { selector } = createSelector();
    selector.handleInput("z");
    selector.handleInput("z");

    expect(stripAnsi(selector.render(120).join("\n"))).toContain("No commands match \"zz\".");

    selector.handleInput("\u007f");
    selector.handleInput("\u007f");

    const recoveredOutput: string = selector.render(120).map(stripAnsi).join("\n");
    expect(recoveredOutput).toContain("Dev server  bun run dev");
    expect(recoveredOutput).toContain("Run tests   bun test");
  });

  test("clears the search query on Ctrl-C", () => {
    const harness = createSelector();
    harness.selector.handleInput("t");
    harness.selector.handleInput("e");
    harness.selector.handleInput("s");
    harness.selector.handleInput("t");

    expect(stripAnsi(harness.selector.render(120).join("\n"))).not.toContain("Dev server");

    harness.selector.handleInput("\u0003");

    const clearedOutput: string = harness.selector.render(120).map(stripAnsi).join("\n");
    expect(clearedOutput).toContain("Dev server  bun run dev");
    expect(harness.cancelCount).toBe(0);
  });

  test("supports leaving a group with Esc and cancelling from the root with Ctrl-D", () => {
    const escSelector = createSelector();
    escSelector.selector.handleInput("\u001b[B");
    escSelector.selector.handleInput("\u001b[B");
    escSelector.selector.handleInput("\r");
    escSelector.selector.handleInput("\u001b");
    expect(stripAnsi(escSelector.selector.render(120).join("\n"))).toContain("cd          open group");
    expect(escSelector.cancelCount).toBe(0);

    const ctrlDSelector = createSelector();
    ctrlDSelector.selector.handleInput("\u0004");
    expect(ctrlDSelector.cancelCount).toBe(1);
  });

  test("renders a directory-level empty state when no commands are visible", () => {
    const { selector } = createSelector({ commands: [] });
    const output: string = stripAnsi(selector.render(120).join("\n"));

    expect(output).toContain("No commands are configured for this directory.");
  });

  test("truncates output safely in narrow terminals", () => {
    const { selector } = createSelector();
    const lines: string[] = selector.render(24);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(24);
    }
  });
});
