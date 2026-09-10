# @onetype/stack-api-kit

## Functions

### claimedName(name: string): string

### cookieIn(header: string | undefined, name: string): string | undefined

### createKernel(options: KernelOptions): Kernel

### createScopeFilter(tablesByPlugin: Readonly<Record<string, Readonly<Record<string, unknown>>>>): ScopeFilter

### defineCommand<PluginContext = Context>(): <Input extends z.ZodType>(command: Command<PluginContext, Input>) => Command<PluginContext, Input>

### defineListener<PluginContext = Context>(): <Payload extends z.ZodType>(_schema: Payload, listener: Listener<PluginContext, z.infer<Payload>>) => Listener<PluginContext, z.infer<Payload>>

### defineParticipant<PluginContext = Context>(): <Payload extends z.ZodType>(_schema: Payload, participant: Participant<PluginContext, z.infer<Payload>>) => Participant<PluginContext, z.infer<Payload>>

### definePlugin<Schema extends z.ZodType, Services = unknown, Db = unknown>(name: string, definition: Definition<Schema, Services, Db>): Plugin

### defineRoute<PluginContext = Context>(): <Input extends z.ZodType>(route: Route<PluginContext, Input>) => Route<PluginContext, Input>

### discover(modules: PluginModules): Plugin[]

### discoverFrom(folder: string): Promise<DiscoveryResult>

### equalsInConstantTime(left: string, right: string): boolean

### httpClient(options?: HttpClientOptions): (call: HttpRequest) => Promise<unknown>

### isUploadedFile(value: unknown): value is UploadedFile

### limiter(now?: () => number): { spend: (key: string, window: RateLimitWindow) => RateLimitResult; refund: (key: string) => void; sweep: () => number; size: () => number; }

### measure<Unit extends string>(_unit: Unit): (count: number) => Tagged<Unit>

### outbox(connection: Database.Database): Outbox

### refusalBodyFor(cause: unknown): RefusalBody

### requestId(header: string | undefined): string

### schedule(connection: Database.Database): Schedule

### serve(options: ServerOptions): Hono

### sockets(kernel: { channels: () => readonly RegisteredChannel[]; }, claim?: string): { push: (message: ChannelMessage) => void; subscribe: (identity: Identity | undefined, send: (text: string) => void) => Subscription; }

### start(options: StartOptions): Promise<RunningApp>

### unlimited(): { spend: () => RateLimitResult; refund: () => void; sweep: () => number; size: () => number; }

## Classes

### HttpRequestError
    readonly code: "TIMEOUT" | "ABORTED" | "NETWORK" | "TOO_LARGE" | "MALFORMED" | "STATUS"
    readonly status: number | undefined
    readonly retryAfter: number | undefined
    constructor(code: HttpRequestError["code"], message: string, status?: number, cause?: unknown, retryAfter?: number)

### KernelFault
    readonly code: FaultCode
    readonly plugin: string | undefined
    readonly detail: Readonly<Record<string, unknown>>
    constructor(code: FaultCode, message: string, about?: FaultDetail)

### MigrationFault
    readonly plugin: string
    readonly step: string | undefined
    constructor(message: string, plugin: string, step?: string)

### Refusal
    readonly status: number
    readonly code: string
    readonly fields: Readonly<Record<string, string>> | undefined
    constructor(status: number, code: string, message: string, fields?: Readonly<Record<string, string>>)

### Reply
    readonly status: number
    readonly body: unknown
    readonly headers: Readonly<Record<string, string>>
    constructor(status: number, body: unknown, headers?: Readonly<Record<string, string>>)
    static redirect(to: string, permanent?: boolean): Reply

## Types

### AnyCommand
    describe: string
    schema: z.ZodType
    requires?: readonly string[]
    run: (input: never, ctx: Context) => void | Promise<void>

### AnyRoute
    input: z.ZodType
    handle: (input: never, ctx: Context) => unknown | Promise<unknown>

### Channel
    describe: string
    schema: z.ZodType
    reach: ChannelReach
    requires?: readonly string[]

### ChannelMessage
    channel: string
    message: unknown
    reach: ChannelReach
    requires: readonly string[]
    scope: string | undefined
    from: Identity | undefined

### ChannelReach
    "connection" | "viewer" | "scope" | "everyone"

### Command
    describe: string
    schema: Input
    requires?: readonly string[]
    run: (input: z.infer<Input>, ctx: Context) => void | Promise<void>

### Context
    name: string
    config: Config
    services: Services
    log: Logger
    now: () => number
    identity: Identity | undefined
    headers: Readonly<Record<string, string>>
    sent: Uint8Array | undefined
    db: Db
    write: <Result>(run: () => Promise<Result>) => Promise<Result>
    tx: <Result>(run: (ctx: Context<Config, Services, Db>) => Promise<Result>) => Promise<Result>
    fetch: (call: HttpRequest) => Promise<unknown>
    events: { emit: (event: string, payload: unknown) => void; }
    push: (channel: string, message: unknown) => void
    hooks: { run: (hook: string, payload: unknown) => Promise<string | undefined>; }
    permissions: { has: (permission: string) => boolean; all: (permissions: readonly string[]) => boolean; claims: () => Readonly<Record<string, unknown>>; }
    commands: { run: (command: string, input: unknown) => Promise<void>; later: (command: string, input: unknown, inSeconds: number) => void; }
    owns: <Kept>(kept: Kept) => Kept
    owned: <Kept>() => Kept | undefined
    scoped: <Condition = unknown>(table: string) => Condition
    stamped: (table: string) => Readonly<Record<string, string>>
    forScope: (claim: string) => Context<Config, Services, Db>
    use: <Api>(plugin: string) => Api

### ContractProblem
    code: KernelFault["code"]
    plugin: string
    message: string

### DatabaseOptions
    file: string
    busyMs?: number
    wal?: boolean

### Definition
    describe: string
    version: string
    dependsOn?: readonly string[]
    config?: Schema
    permissions?: Readonly<Record<string, Permission>>
    tables?: Readonly<Record<string, unknown>>
    scope?: { describe: string; claim: string; tables: Readonly<Record<string, string>>; }
    migrations?: string
    allowedHosts?: readonly string[] | "anywhere"
    services?: (ctx: Context<z.infer<Schema>, never, Db>) => Services
    routes?: readonly AnyRoute<Context<z.infer<Schema>, NoExtraKeys<Services>, Db>>[]
    emits?: Readonly<Record<string, Event>>
    channels?: Readonly<Record<string, Channel>>
    listens?: Readonly<Record<string, EmittedEvent<Context<z.infer<Schema>, NoExtraKeys<Services>, Db>>>>
    hooks?: Readonly<Record<string, Hook>>
    participates?: Readonly<Record<string, Participation<Context<z.infer<Schema>, NoExtraKeys<Services>, Db>>>>
    commands?: Readonly<Record<string, AnyCommand<Context<z.infer<Schema>, NoExtraKeys<Services>, Db>>>>
    identifies?: (ctx: Context<z.infer<Schema>, NoExtraKeys<Services>, Db>, request: Request) => Promise<IdentifiedCaller | undefined> | IdentifiedCaller | undefined
    grants?: (ctx: Context<z.infer<Schema>, NoExtraKeys<Services>, Db>, identity: Omit<Identity, "permissions">) => Promise<readonly string[]> | readonly string[]
    mayGrant?: readonly string[]
    setup?: (ctx: Context<z.infer<Schema>, NoExtraKeys<Services>, Db>) => void | Promise<void>
    teardown?: (ctx: Context<z.infer<Schema>, NoExtraKeys<Services>, Db>) => void | Promise<void>

### Describable
    describe: string

### DescribableWithSchema
    describe: string
    schema: z.ZodType

### DiscoveryResult
    plugins: Plugin[]
    skipped: SkippedFolder[]

### DrizzleDb
    ReturnType<typeof drizzle>

### EmittedEvent
    describe: string
    handle: (payload: never, ctx: Context) => void | Promise<void>

### Event
    describe: string
    schema: z.ZodType

### FailedJob
    plugin: string
    command: string
    input: unknown
    attempts: number
    error: unknown
    at: number

### FaultCode
    "DUPLICATE_PLUGIN" | "UNKNOWN_DEPENDENCY" | "DEPENDENCY_CYCLE" | "INVALID_NAME" | "INVALID_CONFIG" | "INVALID_ROUTE" | "INVALID_PAYLOAD" | "WRONG_PAYLOAD" | "INVALID_OUTPUT" | "UNDECLARED_CHANNEL" | "UNDECLARED_EVENT" | "UNHEARD_EVENT" | "UNDECLARED_HOOK" | "UNDECLARED_COMMAND" | "UNDECLARED_SCOPE" | "UNSCOPED_CALLER" | "UNCLAIMED_SCOPE" | "OUT_OF_SCOPE" | "UNDECLARED_PERMISSION" | "UNDECLARED_DEPENDENCY" | "UNDECLARED_HOST" | "DUPLICATE_ROUTE" | "DUPLICATE_CHANNEL" | "DUPLICATE_EVENT" | "DUPLICATE_HOOK" | "DUPLICATE_COMMAND" | "DUPLICATE_PERMISSION" | "DUPLICATE_GRANTS" | "UNGRANTABLE_PERMISSION" | "DUPLICATE_TABLE" | "UNAUTHENTICATED" | "PERMISSION_DENIED" | "RATE_LIMITED" | "NOT_STARTED"

### HonoApp
    ReturnType<typeof serve>

### Hook
    describe: string
    schema: z.ZodType

### HttpClient
    (call: HttpRequest) => Promise<unknown>

### HttpClientOptions
    timeoutMs?: number
    maxBytes?: number
    headers?: (() => Readonly<Record<string, string>>) | undefined

### HttpMethod
    "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

### HttpRequest
    method: HttpMethod
    url: string
    body?: unknown
    accepts?: "json" | "text"
    headers?: Readonly<Record<string, string>> | undefined
    signal?: AbortSignal | undefined

### IdentifiedCaller
    permissions?: never

### Identity
    id: string
    permissions: readonly string[]
    claims: Readonly<Record<string, unknown>>

### Kernel
    start: () => Promise<void>
    stop: () => Promise<void>
    started: () => boolean
    routes: () => readonly RegisteredRoute[]
    channels: () => readonly RegisteredChannel[]
    permissions: () => readonly PermissionEntry[]
    handle: (incoming: KernelRequest) => Promise<KernelResponse>
    context: (plugin: string, identity?: Identity) => Context
    identify: ((request: Request) => Promise<Identity | undefined>) | undefined
    events: { failures: () => readonly ListenerFailure[]; }
    work: { failed: () => readonly FailedJob[]; }
    due: () => Promise<number>
    run: (command: string, input: unknown, identity?: Identity) => Promise<void>

### KernelOptions
    plugins: readonly Plugin[]
    config?: Readonly<Record<string, unknown>>
    db?: KernelStore
    sockets?: Sockets
    httpClient?: HttpClient
    log?: LogFn
    rateLimiter?: RateLimiter
    outbox?: Outbox
    now?: () => number
    schedule?: Schedule
    beatMs?: number
    mostAttempts?: number
    scopeFilter?: ScopeFilter
    hookTimeoutMs?: number

### KernelRequest
    method: HttpMethod
    path: string
    input: unknown
    identity?: Identity | undefined
    headers?: Readonly<Record<string, string>> | undefined
    sent?: Uint8Array | undefined
    from?: string | undefined

### KernelResponse
    status: number
    body: unknown
    headers?: Readonly<Record<string, string>>

### KernelStore
    forPlugin: (plugin: string) => unknown
    tx: <Result>(plugin: string, run: (db: unknown) => Promise<Result>) => Promise<Result>
    write?: <Result>(run: () => Promise<Result>) => Promise<Result>
    inTransaction?: () => boolean

### Listener
    describe: string
    handle: (payload: Payload, ctx: Context) => void | Promise<void>

### ListenerFailure
    event: string
    plugin: string
    error: unknown
    at: number

### LogFn
    (level: "debug" | "info" | "warn" | "error", plugin: string, line: string, about?: Readonly<Record<string, unknown>>) => void

### Logger
    debug: (line: string, about?: Readonly<Record<string, unknown>>) => void
    info: (line: string, about?: Readonly<Record<string, unknown>>) => void
    warn: (line: string, about?: Readonly<Record<string, unknown>>) => void
    error: (line: string, about?: Readonly<Record<string, unknown>>) => void

### MigrationSource
    plugin: string
    from: string

### MigrationStep
    plugin: string
    name: string
    sql: string
    hash: string

### Outbox
    save: (db: unknown, messages: readonly OutboxMessage[]) => void
    markSent: (id: string) => Promise<void>
    pending: () => Promise<readonly OutboxMessage[]>

### OutboxMessage
    id: string
    plugin: string
    name: string
    payload: unknown

### Participant
    describe: string
    handle: (payload: Payload, ctx: Context) => string | undefined | Promise<string | undefined>

### Participation
    describe: string
    handle: (payload: never, ctx: Context) => string | undefined | Promise<string | undefined>

### Permission
    describe: string

### PermissionEntry
    plugin: string
    permission: string
    describe: string

### Plugin
    name: string
    definition: Definition

### QueuedJob
    id: string
    plugin: string
    command: string
    input: unknown
    at: number
    attempts: number

### RateLimiter
    spend: (key: string, window: { requests: number; seconds: number; }) => { allowed: boolean; resetsIn: number; }
    refund?: (key: string) => void

### RateLimitResult
    allowed: boolean
    remaining: number
    resetsIn: number

### RateLimitWindow
    requests: number
    seconds: number

### RefusalBody
    status: number
    code: string
    message: string
    fields?: Readonly<Record<string, string>>

### RegisteredChannel
    plugin: string
    channel: string
    reach: ChannelReach
    requires: readonly string[]

### RegisteredRoute
    plugin: string
    method: HttpMethod
    path: string
    describe: string
    requires: readonly string[]
    public: boolean
    limit: { requests: number; seconds: number; } | undefined
    accepts: "json" | "form"
    reads: readonly string[]
    keepsRaw: boolean

### Route
    describe: string
    method: HttpMethod
    path: string
    input: Input
    output: z.ZodType
    requires?: readonly string[]
    public?: boolean
    limit?: { requests: number; seconds: number; countSuccess?: boolean; }
    accepts?: "json" | "form"
    reads?: readonly string[]
    keepsRaw?: boolean
    handle: (input: z.infer<Input>, ctx: Context) => unknown | Promise<unknown>

### RunningApp
    kernel: Kernel
    store: Store
    app: ReturnType<typeof serve>
    fetch: (request: Request) => Response | Promise<Response>
    sockets: { subscribe: (identity: Identity | undefined, send: (text: string) => void) => Subscription; } | undefined
    stop: () => Promise<void>

### Schedule
    save: (db: unknown, job: QueuedJob) => void
    claim: (now: number, limit: number) => Promise<readonly QueuedJob[]>
    markDone: (id: string) => Promise<void>
    markFailed: (id: string, at: number) => Promise<void>
    giveUp: (id: string) => Promise<void>

### ScopeFilter
    (table: string, column: string, value: string) => unknown

### securityHeaders
    Readonly<Record<string, string>>

### ServerOptions
    kernel: Kernel
    identify?: ((c: HonoContext) => Identity | undefined | Promise<Identity | undefined>) | undefined
    from?: ((c: HonoContext) => string) | undefined
    origins?: readonly string[]
    methods?: readonly string[]
    headers?: readonly string[]
    maxAge?: number
    bodyBytes?: number
    session?: SessionOptions | undefined
    log?: ((level: "info" | "warn" | "error", line: string, about?: Readonly<Record<string, unknown>>) => void) | undefined

### SessionHeaders
    { readonly key: "x-session-key"; readonly expires: "x-session-expires"; readonly end: "x-session-end"; }

### SessionOptions
    name: string
    secure: boolean
    sameSite?: "Strict" | "Lax" | "None"
    path?: string
    domain?: string

### SkippedFolder
    folder: string
    why: string

### Sockets
    push: (sending: ChannelMessage) => void

### StartOptions
    plugins: readonly Plugin[]
    database?: DatabaseOptions | Store | undefined
    config?: Readonly<Record<string, unknown>> | undefined
    sockets?: boolean | { claim: string; } | undefined
    identify?: ((kernel: Kernel) => ServerOptions["identify"]) | undefined
    http?: Omit<ServerOptions, "kernel" | "identify" | "log"> | undefined
    httpClient?: HttpClientOptions | HttpClient | undefined
    rateLimiter?: RateLimiter | undefined
    limits?: boolean | undefined
    outbox?: boolean | undefined
    schedule?: boolean | undefined
    log?: Logger | undefined

### Store
    forPlugin: (plugin: string) => Db
    outbox?: () => Outbox
    schedule?: () => Schedule
    createScopeFilter?: () => ScopeFilter
    tx: <Result>(plugin: string, run: (db: unknown) => Promise<Result>) => Promise<Result>
    write: <Result>(run: () => Promise<Result>) => Promise<Result>
    inTransaction: () => boolean
    migrate: (sources: readonly MigrationSource[]) => MigrationStep[]
    close: () => void

### Subscription
    isListening: (channel: string) => boolean
    listenTo: (channel: string) => boolean
    stopListening: (channel: string) => void
    close: () => void

### TablesByName
    Readonly<Record<string, unknown>>

### Tagged
    number & { readonly measure: Unit; }

### UploadedFile
    name: string
    type: string
    bytes: Uint8Array

# @onetype/stack-api-kit/testing

## Functions

### createIdentity(permissions?: readonly string[], id?: string, claims?: Readonly<Record<string, unknown>>): Identity

### findCopiedVocabulary(root: string): CopiedVocabulary[]

### findImportViolations(root: string): ImportViolation[]

### findMissingDocs(root: string, required: readonly string[]): string[]

### findOversizedDocs(root: string, limit?: number): OversizedDoc[]

### findSharedNames(root: string): DuplicateSignature[]

### findSplitVocabulary(root: string): SplitVocabulary[]

### findUndocumentedKeys(contractPath: string, procedurePath: string): string[]

### findUnexplainedPlugins(folder: string): string[]

### findUnusedFields(root: string, separately?: boolean): UnusedField[]

### startTestKernel(options: TestKernelOptions): Promise<TestKernel>

## Types

### CopiedVocabulary
    name: string
    owner: string
    copier: string
    file: string
    values: readonly string[]

### DuplicateSignature
    signature: string
    plugins: readonly string[]
    files: readonly string[]

### HttpRequest
    method: HttpMethod
    url: string
    body?: unknown
    accepts?: "json" | "text"
    headers?: Readonly<Record<string, string>> | undefined
    signal?: AbortSignal | undefined

### Identity
    id: string
    permissions: readonly string[]
    claims: Readonly<Record<string, unknown>>

### ImportEdge
    from: string
    to: string
    specifier: string

### ImportViolation
    rule: "undeclared" | "deep" | "cycle" | "contract" | "escape" | "twice"
    message: string

### LogLine
    level: string
    plugin: string
    line: string

### OversizedDoc
    path: string
    size: number

### Project
    findAll: (checking?: ProjectCheckOptions) => ProjectProblem[]
    findImportViolations: (root: string, leaving?: readonly string[]) => ProjectProblem[]
    findUnusedFields: (root: string, apart?: boolean) => ProjectProblem[]
    findUnexplainedPlugins: (root: string) => ProjectProblem[]
    findCopiedVocabulary: (root: string, excused?: readonly string[]) => ProjectProblem[]
    findSplitVocabulary: (root: string, excused?: readonly string[]) => ProjectProblem[]
    findSharedNames: (root: string, excused?: readonly string[]) => ProjectProblem[]
    findOversizedDocs: (root: string, limit: number) => ProjectProblem[]
    findUndocumentedKeys: (procedure: string) => ProjectProblem[]

### ProjectCheckOptions
    root?: string
    plugins?: string
    utils?: string
    docs?: string
    required?: readonly string[]
    procedure?: string
    limit?: number
    sharing?: readonly string[]
    apart?: readonly string[]
    leaving?: readonly string[]

### ProjectProblem
    check: "boundaries" | "wiring" | "oversized" | "missing" | "unexplained" | "undocumented" | "twice" | "split"
    message: string

### SentRequest
    method: string
    url: string
    body: unknown
    headers: Readonly<Record<string, string>> | undefined

### SplitVocabulary
    name: string
    plugins: readonly string[]
    files: readonly string[]
    shared: readonly string[]
    apart: readonly string[]

### TestKernel
    kernel: Kernel
    store: Store<DrizzleDb>
    logLines: LogLine[]
    sentRequests: () => SentRequest[]
    emittedEvents: () => SeenEvent[]
    pushed: () => ChannelMessage[]
    granted: (claims: Readonly<Record<string, unknown>>, id?: string) => Promise<Identity>
    flush: () => Promise<void>
    due: () => Promise<number>
    drain: (most?: number) => Promise<void>
    stop: () => Promise<void>

### TestKernelOptions
    plugins: readonly Plugin[]
    config?: Readonly<Record<string, unknown>>
    respondWith?: (request: HttpRequest) => unknown
    outbox?: boolean
    schedule?: boolean
    sockets?: boolean
    now?: () => number

### testTables
    tables: (plugins: readonly Plugin[]) => Readonly<Record<string, Readonly<Record<string, unknown>>>>
    migrations: (plugins: readonly Plugin[]) => { plugin: string; from: string; }[]

### UndocumentedKey
    key: string

### UnusedField
    file: string
    shape: string
    field: string

