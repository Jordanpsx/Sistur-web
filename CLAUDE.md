# CLAUDE.md — sistur-web

Frontend público em Next.js da Cachoeira do Girassol. Consome o Sistur como
backend headless; nenhuma regra de negócio e nenhum preço vivem aqui.

@.claude/skills/design-system.md

---

## Contexto rápido

- **Repositório público.** Nada de hostname interno, porta, chave ou detalhe de
  runtime em código, comentário ou README.
- **Preço e disponibilidade vêm do Sistur** a cada requisição. Ver a skill.
- **Um formulário só.** Day use e camping são a mesma rota `[experiencia]`,
  parametrizada pela categoria — diferem nos dados, não no código.
- **Testes:** `docker run --rm --network sistur_shared_net --env-file .env sistur-web-test`.
  As suítes de integração se pulam sem `SISTUR_API_URL`/`SITE_URL`, e só criam
  reserva de verdade com `SISTUR_ALVO_DESCARTAVEL=1`.
