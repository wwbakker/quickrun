import { describe, expect, test } from "bun:test";
import path from "node:path";

function runZsh(script: string): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync({
    cmd: ["zsh", "-lc", script],
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
  });

  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode,
  };
}

describe("phase 7 zsh integration", () => {
  const wrapperPath: string = path.resolve(process.cwd(), "examples/quickrun.zsh");
  const bunWrapperPath: string = path.resolve(process.cwd(), "examples/quickrun-bun.zsh");

  test("PATH-backed wrapper script is valid zsh", () => {
    const result = Bun.spawnSync({
      cmd: ["zsh", "-n", wrapperPath],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    expect(result.exitCode).toBe(0);
    expect(new TextDecoder().decode(result.stderr)).toBe("");
  });

  test("bun-backed wrapper script is valid zsh", () => {
    const result = Bun.spawnSync({
      cmd: ["zsh", "-n", bunWrapperPath],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    expect(result.exitCode).toBe(0);
    expect(new TextDecoder().decode(result.stderr)).toBe("");
  });

  test("executes the selected command in the current shell context", () => {
    const result = runZsh(`
      source ${JSON.stringify(wrapperPath)}
      function quickrun-ts() {
        print -r -- 'export QUICKRUN_SELECTED=ok'
      }
      qr
      print -r -- "$QUICKRUN_SELECTED"
    `);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe("ok");
  });

  test("does nothing when the selector is cancelled or emits nothing", () => {
    const cancelled = runZsh(`
      source ${JSON.stringify(wrapperPath)}
      QUICKRUN_SELECTED=before
      function quickrun-ts() {
        return 1
      }
      qr
      print -r -- "$QUICKRUN_SELECTED"
    `);

    expect(cancelled.exitCode).toBe(0);
    expect(cancelled.stdout.trim()).toBe("before");

    const empty = runZsh(`
      source ${JSON.stringify(wrapperPath)}
      QUICKRUN_SELECTED=before
      function quickrun-ts() {
        return 0
      }
      qr
      print -r -- "$QUICKRUN_SELECTED"
    `);

    expect(empty.exitCode).toBe(0);
    expect(empty.stdout.trim()).toBe("before");
  });

  test("bun-backed wrapper auto-detects the repo and uses bun on each invocation", () => {
    const result = runZsh(`
      source ${JSON.stringify(bunWrapperPath)}
      function bun() {
        print -r -- 'export QUICKRUN_SELECTED=live'
      }
      print -r -- "$QUICKRUN_REPO_DIR"
      qr
      print -r -- "$QUICKRUN_SELECTED"
    `);

    const lines = result.stdout.trim().split(/\n+/);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(lines[0]).toBe(path.resolve(process.cwd()));
    expect(lines[1]).toBe("live");
  });
});
