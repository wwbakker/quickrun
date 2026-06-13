import { describe, expect, test } from "bun:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import { QuickrunSelector } from "../src/selector.ts";
import type { QuickCommand } from "../src/types.ts";

const commands: QuickCommand[] = [
  {
    id: "dev",
    title: "Dev server",
    command: "bun run dev",
    when: "**",
    description: "Start the app in development mode.",
    tags: ["frontend", "dev"],
  },
  {
    id: "test",
    title: "Run tests",
    command: "bun test",
    when: "**",
    description: "Execute the test suite.",
    tags: ["qa", "test"],
  },
  {
    id: "build",
    title: "Build app",
    command: "bun run build",
    when: "**",
    description: "Create a production build.",
    tags: ["build", "release"],
  },
];

function createSelector(overrides?: Partial<{ commands: QuickCommand[] }>): {
  selector: QuickrunSelector;
  selectedCommands: QuickCommand[];
  cancelCount: number;
  renderCount: number;
} {
  const selectedCommands: QuickCommand[] = [];
  let cancelCount: number = 0;
  let renderCount: number = 0;

  const selector: QuickrunSelector = new QuickrunSelector({
    cwd: "/Users/tester/Repos/personal/quickrun-ts",
    commands: overrides?.commands ?? commands,
    onSelect: (command: QuickCommand) => {
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
  test("renders commands immediately with search instructions", () => {
    const { selector } = createSelector();
    const output: string = selector.render(120).join("\n");

    expect(output).toContain("Quickrun");
    expect(output).toContain("search: ");
    expect(output).toContain("Dev server");
    expect(output).toContain("Run tests");
  });

  test("filters results as the user types", () => {
    const harness = createSelector();
    harness.selector.handleInput("d");
    harness.selector.handleInput("e");
    harness.selector.handleInput("v");

    const output: string = harness.selector.render(120).join("\n");
    expect(output).toContain("search: dev");
    expect(output).toContain("Dev server");
    expect(output).not.toContain("Run tests");
    expect(harness.renderCount).toBeGreaterThan(0);
  });

  test("supports keyboard navigation and selection on Enter", () => {
    const { selector, selectedCommands } = createSelector();
    selector.handleInput("\u001b[B");

    const navigatedOutput: string = selector.render(120).join("\n");
    expect(navigatedOutput).toContain("> Run tests");

    selector.handleInput("\r");
    expect(selectedCommands.map((command: QuickCommand) => command.id)).toEqual(["test"]);
  });

  test("clamps the selected row when filtering shrinks the result set", () => {
    const { selector, selectedCommands } = createSelector();
    selector.handleInput("\u001b[B");
    selector.handleInput("\u001b[B");
    selector.handleInput("t");
    selector.handleInput("e");
    selector.handleInput("s");
    selector.handleInput("t");
    selector.handleInput("\r");

    expect(selectedCommands.map((command: QuickCommand) => command.id)).toEqual(["test"]);
  });

  test("shows a no-results state and lets Backspace recover", () => {
    const { selector } = createSelector();
    selector.handleInput("z");
    selector.handleInput("z");

    expect(selector.render(120).join("\n")).toContain("No commands match \"zz\".");

    selector.handleInput("\u007f");
    selector.handleInput("\u007f");

    const recoveredOutput: string = selector.render(120).join("\n");
    expect(recoveredOutput).toContain("Dev server");
    expect(recoveredOutput).toContain("Run tests");
  });

  test("supports cancellation with Esc and Ctrl-C", () => {
    const escSelector = createSelector();
    escSelector.selector.handleInput("\u001b");
    expect(escSelector.cancelCount).toBe(1);

    const ctrlCSelector = createSelector();
    ctrlCSelector.selector.handleInput("\u0003");
    expect(ctrlCSelector.cancelCount).toBe(1);
  });

  test("renders a directory-level empty state when no commands are visible", () => {
    const { selector } = createSelector({ commands: [] });
    const output: string = selector.render(120).join("\n");

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
