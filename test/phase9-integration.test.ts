import { describe, expect, test } from "bun:test";
import { visibleWidth } from "@earendil-works/pi-tui";

import { runSelector } from "../src/app.ts";
import type { QuickCommand } from "../src/types.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const commands: QuickCommand[] = [
  {
    title: "Dev server",
    command: "bun run dev",
    when: ["/Users/tester/Repos/personal/quickrun-ts", "/Users/tester/Repos/personal/quickrun-ts/**"],
    tags: ["frontend", "local"],
  },
  {
    title: "Run tests",
    command: "bun test",
    when: ["/Users/tester/Repos/personal/quickrun-ts", "/Users/tester/Repos/personal/quickrun-ts/**"],
    tags: ["qa", "checks"],
  },
  {
    title: "Deploy work app",
    command: "./deploy.sh",
    when: ["/Users/tester/Repos/work/app", "/Users/tester/Repos/work/app/**"],
    tags: ["release", "deploy"],
  },
];

async function startSelector(cwd: string, columns: number = 80, rows: number = 20): Promise<{
  terminal: VirtualTerminal;
  resultPromise: Promise<string | null>;
}> {
  const terminal = new VirtualTerminal(columns, rows);
  const resultPromise = runSelector({
    terminal,
    cwd,
    commands,
  });
  await terminal.waitForRender();
  return { terminal, resultPromise };
}

async function sendInputAndWait(terminal: VirtualTerminal, data: string): Promise<void> {
  terminal.sendInput(data);
  await terminal.waitForRender();
}

describe("phase 9 integration flow", () => {
  test("renders compact aligned matching commands immediately for the current cwd", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");
    const viewport: string = terminal.getViewport().join("\n");

    expect(viewport).toContain("Dev server  bun run dev");
    expect(viewport).toContain("Run tests   bun test");
    expect(viewport).not.toContain("Deploy work app");
    expect(viewport).not.toContain("Quickrun");
    expect(viewport).not.toContain("search:");

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
  });

  test("applies cwd filtering end-to-end", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/work/app");
    const viewport: string = terminal.getViewport().join("\n");

    expect(viewport).toContain("Deploy work app  ./deploy.sh");
    expect(viewport).not.toContain("Dev server");

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
  });

  test("filters results when typing into search", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    await sendInputAndWait(terminal, "d");
    await sendInputAndWait(terminal, "e");
    await sendInputAndWait(terminal, "v");

    const viewport: string = terminal.getViewport().join("\n");
    expect(viewport).toContain("Dev server  bun run dev");
    expect(viewport).not.toContain("Run tests");

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
  });

  test("clears the search query on Ctrl-C", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    await sendInputAndWait(terminal, "t");
    await sendInputAndWait(terminal, "e");
    await sendInputAndWait(terminal, "s");
    await sendInputAndWait(terminal, "t");

    expect(terminal.getViewport().join("\n")).not.toContain("Dev server");

    await sendInputAndWait(terminal, "\u0003");

    const viewport: string = terminal.getViewport().join("\n");
    expect(viewport).toContain("Dev server  bun run dev");
    expect(viewport).toContain("Run tests   bun test");

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
  });

  test("moves selection with arrow keys", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    await sendInputAndWait(terminal, "\u001b[B");
    terminal.sendInput("\r");

    await expect(resultPromise).resolves.toBe("bun test");
  });

  test("returns the selected command on Enter, clears the UI, and reports the command", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    terminal.sendInput("\r");

    await expect(resultPromise).resolves.toBe("bun run dev");
    await terminal.flush();
    expect(terminal.getViewport().join("\n")).toContain("ran bun run dev");
  });

  test("returns null on Esc and clears the UI", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
    await terminal.flush();
    expect(terminal.getViewport().join("\n").trim()).toBe("");
  });

  test("returns null on Ctrl-D and clears the UI", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    terminal.sendInput("\u0004");
    await expect(resultPromise).resolves.toBeNull();
    await terminal.flush();
    expect(terminal.getViewport().join("\n").trim()).toBe("");
  });

  test("shows a no-results state when the query matches nothing", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts");

    await sendInputAndWait(terminal, "z");
    await sendInputAndWait(terminal, "z");

    const viewport: string = terminal.getViewport().join("\n");
    expect(viewport).toContain('No commands match "zz".');

    terminal.sendInput("\u001b");
    await expect(resultPromise).resolves.toBeNull();
  });

  test("keeps rendering valid and selection stable after resize", async () => {
    const { terminal, resultPromise } = await startSelector("/Users/tester/Repos/personal/quickrun-ts", 80, 20);

    await sendInputAndWait(terminal, "\u001b[B");
    terminal.resize(32, 12);
    await terminal.waitForRender();

    const viewportLines: string[] = terminal.getViewport();
    expect(viewportLines.join("\n")).toContain("Run tests");

    for (const line of viewportLines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(32);
    }

    terminal.sendInput("\r");
    await expect(resultPromise).resolves.toBe("bun test");
  });
});
