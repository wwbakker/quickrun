# quickrun-ts

`quickrun-ts` is a terminal utility for surfacing frequently used shell commands faster than searching shell history.

The current implementation is an incremental build toward a searchable TUI that:
- filters commands by the current working directory,
- lets you navigate the results with the keyboard, and
- prints the selected command so a shell wrapper can execute it in the current shell.

## Install dependencies

```bash
bun install
```

## Run the current TUI

```bash
bun run index.ts
```

Current controls:
- type to filter commands
- `↑` / `↓` to move the selection
- `Enter` to emit the selected command
- `Backspace` to edit the query
- `Esc` / `Ctrl-C` to cancel

## Command configuration

For v1, the global command registry lives directly in:

- `src/commands.ts`

Edit that file to add or remove commands.

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

### Example

```ts
{
  id: "frontend-dev",
  title: "Start frontend dev server",
  command: "bun run dev",
  when: ["~/Repos/personal/my-app", "~/Repos/personal/my-app/**"],
  description: "Run the app's local development server.",
  tags: ["frontend", "dev", "bun"],
}
```

Using an array for `when` lets one command appear in multiple project scopes.

## Result list format

Each visible command is rendered as:
- primary line: `title`
- secondary line: `command`
- additional context lines: `description` and `tags` when present

## cwd matching rules

- A command is visible when **any** glob in `when` matches the current working directory.
- Matching is done against **normalized absolute paths**.
- `~` is expanded to the current user's home directory.
- Paths are normalized to use forward slashes.
- Matching is currently **case-sensitive**.

Examples:
- `~/Repos/personal/my-app` matches that exact project root.
- `~/Repos/personal/my-app/**` also matches nested directories inside the project.

## Development notes

- `index.ts` is a thin entrypoint
- `src/cli.ts` starts the real terminal app
- `src/app.ts` exposes the testable selector runner
- `src/commands.ts` contains the built-in global TypeScript config

## Tests

Run the full test suite with:

```bash
bun test
```

Type-check with:

```bash
bunx tsc --noEmit
```
