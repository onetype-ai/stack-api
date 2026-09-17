# Placeholders

Substitute every one; none is a name to keep.

| | |
|---|---|
| `<plugin>` | the folder name, lowercase |
| `<Plugin>` | the same, PascalCase, for types it owns |
| `<Type>` | a type or schema the plugin exports |
| `<service>` | the key a service is reached by on `ctx.services` |
| `<member>` | a method or property |
| `<table>` | a table, unprefixed: the kernel adds `<plugin>_` |
| `<field>` | a column or schema field |
| `<scope>` | what a row belongs to, where the plugin scopes |
| `<value>` | a local holding one parsed or fetched item |
| `<row>` | a local holding one database row |
| `<event>` | a state change announced |
| `<action>` | the operation a hook or command names |
| `<claim>`, `<identity>`, `<host>` | a claim key, a caller id, a hostname |
| `<describe>` | one sentence, for whoever reads the failure |

Real type names appear as themselves. A method is a verb in the imperative:
`get`, `list`, `create`, `update`, `remove`, `find`, `send`, `handle`.
