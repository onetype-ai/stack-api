# Procedure: what the project refuses

One test runs over the whole repository. Each check fails the build, answering
`{ check, message }` naming the file.

## A boundary crossed undeclared

An import of another plugin that `dependsOn` does not name, or one reaching
past its `index.ts`.

A test may name `@plugins/<other>/plugin`, the contract itself, for anything
it has to boot. Nothing deeper, and production code gets no exemption.

## A field nothing reads

An exported type declaring a field no production file in its own plugin reads.
A field for later is not a field yet.

## A folder with no contract

A directory under `src/plugins/` with no `plugin.ts`.

## A document that outgrew its point

Anything under `#docs/` over 1800 characters, and any plugin with no
`usage.md`. Every key the contract accepts must be named in
`procedures/plugin/contract.md`.

## What it does not look at

- **Only exported types.** An unexported one, a comment, or a test reading the
  field does not count, and only the declaring plugin is searched.
- **Only `#docs/`.** The size limit never reaches a plugin's own `usage.md`.
  Hold that limit yourself.
- The `progress` folder is skipped, and `checking.limit` moves the number.
- `src/utils` is checked for unread fields too, not only `src/plugins`.
