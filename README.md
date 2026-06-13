# quickrun-ts

`quickrun-ts` is a terminal utility for surfacing frequently used shell commands faster than searching shell history.

The current implementation is an incremental build toward a searchable TUI that:
- filters commands by the current working directory,
- lets you navigate the results with the keyboard, and
- prints the selected command so a shell wrapper can execute it in the current shell.

The CLI renders the interactive UI on the terminal stream and keeps the final selected command on stdout so shell wrappers can capture it cleanly.

## Install dependencies

```bash
bun install
```

## Run the TUI

```bash
bun run index.ts
```

Or, using the package scripts:

```bash
bun run start
```

Current controls:
- type to filter commands
- `↑` / `↓` to move the selection
- `Enter` to emit the selected command
- `Backspace` to edit the query
- `Ctrl-C` to clear the current search query
- `Esc` / `Ctrl-D` to cancel

Example terminal output:

```text
Dev server  bun run dev
Run tests   bun test
Build app   bun run build
```

## Command configuration

Quickrun now uses a two-layer config setup:

- `src/commands.example.ts` — checked in example/default commands with generic paths
- `src/commands.local.ts` — optional local commands file, ignored by Git

`src/commands.ts` loads the checked-in example config and appends any commands from `src/commands.local.ts` when that file exists.

For personal customization, put your real machine-specific commands in `src/commands.local.ts` instead of editing the tracked example file.

### Command shape

```ts
export interface QuickCommand {
  id: string;
  title: string;
  command: string;
  when: string | string[];
  description?: string;
  tags?: string[];
}
```

### Field meanings

- `id`: stable identifier for the command entry
- `title`: primary label shown in the selector
- `command`: shell command emitted when the entry is selected
- `when`: one or more cwd glob patterns that control visibility
- `description`: optional secondary searchable text
- `tags`: optional extra search hints

### Example local file

Create `src/commands.local.ts` like this:

```ts
import { defineCommands, defineQuickrunConfig, type QuickrunConfig } from "./types.ts";

export const quickrunLocalConfig: QuickrunConfig = defineQuickrunConfig({
  commands: defineCommands([
    {
      id: "frontend-dev",
      title: "Start frontend dev server",
      command: "bun run dev",
      when: ["~/Repos/personal/my-app", "~/Repos/personal/my-app/**"],
      description: "Run the app's local development server.",
      tags: ["frontend", "dev", "bun"],
    },
  ]),
});
```

You can also export `localCommands` directly instead of `quickrunLocalConfig` if you prefer.

Using an array for `when` lets one command appear in multiple project scopes.

## Result list format

Each visible command is rendered on a single line:
- aligned title column
- aligned command column
- white `title`
- gray `command`
- selected row shown with a light background and darker foreground

## cwd matching rules

- A command is visible when **any** glob in `when` matches the current working directory.
- Matching is done against **normalized absolute paths**.
- `~` is expanded to the current user's home directory.
- Paths are normalized to use forward slashes.
- Matching is currently **case-sensitive**.

Examples:
- `~/Repos/personal/my-app` matches that exact project root.
- `~/Repos/personal/my-app/**` also matches nested directories inside the project.

## zsh integration

Sample wrappers are included at:

- `examples/quickrun.zsh` — expects `quickrun-ts` on your `PATH`
- `examples/quickrun-bun.zsh` — runs the repo source with `bun run` on every invocation

You can either copy a function into `~/.zshrc` or source one of those files.

Examples:

```zsh
source /absolute/path/to/quickrun-ts/examples/quickrun.zsh
source /absolute/path/to/quickrun-ts/examples/quickrun-bun.zsh
```

Use `examples/quickrun-bun.zsh` during development if you want source changes to be reflected the next time `qr` runs, without reinstalling or rebuilding anything.

If you prefer not to source the file and instead copy the function into `~/.zshrc`, point it at this repo directly, for example:

```zsh
export QUICKRUN_REPO_DIR=/absolute/path/to/quickrun-ts
cmd="$(bun run "$QUICKRUN_REPO_DIR/index.ts")" || return
```

Wrapper behavior:
- captures the selected command from stdout
- does nothing when the selector is cancelled
- executes the selected command in the current shell with `eval`

### Safety note

The zsh wrapper uses `eval` so the emitted command runs in your current shell context. That is necessary for shell-native behavior, but it also means you should only configure commands you trust.

## Development notes

- `index.ts` is a thin executable entrypoint with a Bun shebang
- `src/cli.ts` contains the CLI contract and stdout/stderr behavior
- `src/app.ts` exposes the testable selector runner
- `src/selector.ts` owns interactive search/navigation rendering
- `src/commands.example.ts` contains the checked-in example/default command config
- `src/commands.ts` loads the example config plus optional local commands
- `test/virtual-terminal.ts` vendors the upstream virtual terminal harness for integration tests

## Tests

Run the full test suite with:

```bash
bun test
```

Or:

```bash
bun run test
```

Type-check with:

```bash
bunx tsc --noEmit
```

Or:

```bash
bun run typecheck
```

The automated test suite includes:
- unit tests for config, cwd matching, search, selector behavior, and CLI output contracts
- integration tests that drive the TUI through a virtual terminal based on `@xterm/headless`
