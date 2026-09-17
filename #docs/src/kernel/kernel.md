# kernel/

What this project decides about itself, before any plugin runs.

```
env.ts       what the environment carries, parsed once and refused early
settings.ts  what a run needs, built from it
logger.ts    where a line goes
plugins.ts   discovery: every folder under plugins/ holding a plugin.ts
```

`main.ts` is the only caller, and what it passes as `config`, keyed by plugin
name, is what each reads as `ctx.config`. A plugin receives that and
`ctx.log`; reaching past them ties a capability to this one deployment.

Edited when the project changes shape: an environment variable, a log level,
somewhere else to find plugins. A capability is never added here — that is a
plugin, and adding one touches no file in this folder.
