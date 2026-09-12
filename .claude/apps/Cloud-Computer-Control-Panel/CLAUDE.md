# CLAUDE.md — `apps/Cloud-Computer-Control-Panel`

Private. Open-source cloud infrastructure management: provisions AWS EC2
instances, installs **Dokploy** for container orchestration, and manages
containers, services and encrypted credentials from one Next.js dashboard.

## This app holds other people's cloud credentials

That is the defining constraint:

- **AWS credentials are stored encrypted.** Never log them, never round-trip
  them through a client component, never put a real-looking key in a fixture.
  Anything that reaches the browser is disclosed.
- **Provisioning actions cost money and are not undoable.** Creating an EC2
  instance, resizing one, or deleting a volume needs an explicit confirmation
  path. Do not add a destructive action to a list row without one.
- Treat every response from AWS or Dokploy as untrusted input before it reaches
  a shell command or a template.

## Shape

`app/` (routes + `/api`) · `components/` (shadcn, see `components.json`) ·
`lib/` · `hooks/` · `data/` · `drizzle.config.ts` · `env.ts` ·
`openapi.json` (the spec the extension and any generated client build on)

```bash
cd apps/Cloud-Computer-Control-Panel
bun run dev
bun run db:generate   # after editing the schema
bun run db:push
bun run lint
```

## Downstream: `apps/cccp-vscode-ext`

The VS Code extension **imports this app's React components unchanged**.
Renaming a component, changing its props, or moving a file under `components/`
breaks the extension — and nothing in this app's own checks will tell you.
Build the extension after changing shared components.
