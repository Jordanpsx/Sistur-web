# Sistur Web

Next.js frontend for the public surface of **Cachoeira do Girassol** — landing pages today,
the booking funnel later. Sistur (Flask + PostgreSQL) remains the backend and the single source
of truth for catalog, pricing, availability and persistence.

> ## ⚠️ Current state: source only — this does not build yet
>
> There is no `package.json`, no `tsconfig.json`, no `Dockerfile` and no CI. What exists is the
> Phase 1a scaffolding, written and reviewed but never executed. **The TypeScript here has never
> been compiled or run.** Treat it as a design artefact until the project is properly initialised.

---

## What is here

| Path | Role |
|---|---|
| `src/app/(public)/[[...slug]]/page.tsx` | Catch-all ISR renderer for CMS-driven pages |
| `src/components/blocks/index.tsx` | Block type → React component registry |
| `src/lib/sistur/pages.ts` | Typed fetchers for the Landing CMS + Zod contract |
| `src/lib/sistur/tags.ts` | Cache tag registry, mirrored by a Postgres trigger |
| `src/app/api/revalidate/route.ts` | HMAC-verified webhook receiver from Sistur |

## The idea

Sistur stores landing page content as **validated, semantic JSONB** — never HTML. A human editor
or an AI agent publishes by writing structured data, so a publish cannot introduce a syntax error,
cannot break the build, and never requires a redeploy. This app maps that data onto React
components and nothing else.

When content changes, a Postgres trigger enqueues an invalidation in the same transaction as the
write. A worker drains that outbox and POSTs a signed payload to `/api/revalidate`, which calls
`revalidateTag`. Time-based revalidation exists only as a self-healing floor if a webhook is lost.

## ⚠️ Cross-repository contract

Three files must agree, and **two of them live in the Sistur repository**
(`Jordanpsx/sistur`, path `sistur-teste/`):

```
LandingPageService.BLOCK_SCHEMAS   (Python — write validation)
   ≡  z.discriminatedUnion(...)    (this repo — src/lib/sistur/pages.ts)
   ≡  switch (block.type)          (this repo — src/components/blocks/index.tsx)
```

A block accepted by Python but missing from the registry renders an **empty page in production,
with no error**. `tests/test_landing_block_contract.py` in the Sistur repository asserts all three
agree — but **it skips silently when this repository is not checked out next to it**, expecting
`../sistur-web`. A green test run is therefore not proof the contract holds; confirm the path.

The same applies to the cache tags in `src/lib/sistur/tags.ts`, which mirror the tags emitted by
the `sistur_landing_pages_revalidate()` trigger.

## Environment

Server-only. Never prefix these with `NEXT_PUBLIC_`.

```bash
SISTUR_API_URL=http://<internal-host>:<port>  # private network — not reachable from a browser
SISTUR_PUBLIC_TOKEN=<token>                   # Authorization: Bearer
REVALIDATE_SECRET=<hmac shared secret>        # verifies the Sistur → Next webhook
```

The API base URL is on a private network, so **every call to Sistur must go through a Server Action
or Route Handler** — the browser cannot reach it, and the token must never be sent to the client.

## Design notes

Full architecture, the audit that shaped it, and the phasing live in `Landing_plan.md` in the
Sistur repository. One constraint worth repeating here, because it is easy to get wrong from this
side:

- **Production is the apex domain**, `cachoeiradogirassol.com.br`. It is the indexed host, and the
  legacy permalinks it inherits end in `/` — so `trailingSlash: true` is required, or every old URL
  404s at once.

The webhook sender runs as its own service on the Sistur side, for reasons documented there.

## Testes

```bash
# unitários apenas (sem backend)
docker build -f Dockerfile.test -t sistur-web-teste-tests . && \
docker run --rm sistur-web-teste-tests

# tudo, contra o staging em execução
docker run --rm --network sistur_shared_net --env-file .env \
  -e SITE_URL=http://<container-do-site>:3000 sistur-web-teste-tests
```

Três camadas, com propósitos distintos:

| Arquivo | O que garante |
|---|---|
| `rateio.test.ts` | A soma dos `price_override` bate com o total, ao centavo |
| `datas.test.ts` | Regras de data e fuso — o container roda UTC, o negócio roda em São Paulo |
| `quantidades.test.ts` | Estado na URL sobrevive à ida e volta, e entrada hostil não derruba a seleção |
| `contrato.integracao.test.ts` | O Sistur concorda com o nosso cálculo — só uma ida real detecta regra mudada lá |
| `funil.integracao.test.ts` | O site em execução se comporta; pega container defasado, que já aconteceu |

Os arquivos `*.integracao.test.ts` se auto-ignoram quando `SISTUR_API_URL` /
`SITE_URL` não estão definidos, então a suíte fica verde numa máquina sem backend.
