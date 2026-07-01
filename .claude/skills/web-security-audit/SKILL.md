---
name: web-security-audit
description: >
  Analisa aplicações web para identificar e corrigir vulnerabilidades de segurança,
  implementando melhores práticas para blindar a aplicação. Use sempre que o usuário
  pedir para: revisar segurança de código, auditoria de segurança, encontrar
  vulnerabilidades, blindar/proteger uma aplicação, verificar XSS/CSRF/SQL Injection,
  revisar headers de segurança, analisar CORS, ou qualquer tarefa de segurança web.
  Dispara também com menções a OWASP, pentest, hardening, sanitização de input,
  ou pedidos como "verificar se tem brecha" em código de qualquer linguagem ou
  framework web (Express, Django, Flask, Laravel, Rails, Spring Boot, Next.js, etc).
  Mesmo sem a palavra "segurança", dispare se o contexto indicar preocupação com
  proteção contra ataques ou vazamentos de dados.
---

# Web Security Audit

Skill para análise profunda de segurança em aplicações web. O objetivo é identificar
vulnerabilidades, corrigi-las e implementar as melhores práticas para que a aplicação
fique o mais protegida possível.

## Filosofia

Segurança não é uma feature isolada — é uma propriedade que permeia toda a aplicação.
Esta skill trata segurança como defesa em profundidade: múltiplas camadas de proteção
onde cada uma compensa possíveis falhas das outras. O princípio central é "nunca confie
em dados que vêm de fora" — todo input do usuário, toda resposta de API externa, todo
cookie, todo header pode ser manipulado por um atacante.

## Fluxo de Análise

Ao receber código para auditoria de segurança, siga este fluxo:

### 1. Reconhecimento

Antes de tudo, entenda o que você está analisando:

- Identifique a stack tecnológica (linguagem, framework, banco de dados, infra)
- Mapeie os pontos de entrada da aplicação (rotas, endpoints, formulários)
- Identifique fluxos de autenticação e autorização
- Localize onde dados sensíveis são processados ou armazenados
- Verifique dependências e suas versões

### 2. Análise por Camadas

Analise a aplicação em camadas, da mais externa à mais interna:

**Camada de Transporte & Headers**
- HTTPS obrigatório com redirecionamento automático de HTTP
- Headers de segurança (consulte `references/headers-and-config.md`)
- HSTS configurado com max-age adequado
- Política de CORS restritiva (não use `*` em produção)

**Camada de Input (Entrada de Dados)**
- Todo input do usuário é validado e sanitizado no servidor
- Validação de tipo, formato, comprimento e range
- Proteção contra XSS (encoding de output contextual)
- Proteção contra SQL Injection (queries parametrizadas, nunca concatenação)
- Proteção contra Command Injection
- Proteção contra Path Traversal
- Upload de arquivos com validação de tipo, tamanho e conteúdo real

**Camada de Autenticação**
- Senhas com hash seguro (bcrypt, scrypt, ou Argon2 — nunca MD5/SHA1/SHA256 puro)
- Proteção contra brute force (rate limiting, lockout progressivo)
- Tokens de sessão com entropia adequada e expiração
- CSRF tokens em formulários e requisições state-changing
- JWT validado corretamente (algoritmo, expiração, issuer, audience)
- MFA disponível e incentivado para contas sensíveis

**Camada de Autorização**
- Controle de acesso em cada endpoint, não apenas na UI
- Verificação de propriedade de recursos (IDOR prevention)
- Princípio do menor privilégio
- Escalação de privilégio bloqueada

**Camada de Dados**
- Dados sensíveis criptografados em repouso e em trânsito
- Secrets (API keys, senhas de DB, tokens) nunca no código-fonte
- Variáveis de ambiente ou secret managers para credenciais
- Logs sem dados sensíveis (senhas, tokens, PII)
- Backup seguro e plano de recuperação

**Camada de Dependências**
- Dependências atualizadas e sem vulnerabilidades conhecidas
- Lockfiles (package-lock.json, Pipfile.lock, etc.) no repositório
- Audit regular de dependências

### 3. Classificação de Severidade

Classifique cada achado usando estes níveis:

- **🔴 CRÍTICO**: Pode ser explorado imediatamente e causa dano grave
  (RCE, SQLi sem autenticação, credenciais hardcoded, bypass de auth)
- **🟠 ALTO**: Exploração provável com impacto significativo
  (XSS stored, IDOR em dados sensíveis, CSRF em operações críticas)
- **🟡 MÉDIO**: Exploração possível ou impacto moderado
  (XSS reflected, headers de segurança ausentes, informações em erros)
- **🔵 BAIXO**: Difícil de explorar ou impacto limitado
  (Verbose errors em dev, headers informativos, práticas subótimas)
- **⚪ INFORMATIVO**: Não é vulnerabilidade mas merece atenção
  (Sugestões de melhoria, boas práticas não implementadas)

### 4. Formato do Relatório

Estruture a análise assim:

```
## Resumo Executivo
Visão geral do estado de segurança da aplicação.
Número total de achados por severidade.

## Achados Críticos e Altos
Para cada achado:
  - Título descritivo
  - Severidade (com emoji de cor)
  - Localização no código (arquivo e linha)
  - Descrição do problema e por que é perigoso
  - Código vulnerável (trecho relevante)
  - Código corrigido (com a correção aplicada)
  - Referência (CWE, OWASP, ou documentação relevante)

## Achados Médios e Baixos
Mesmo formato, agrupados por categoria.

## Recomendações Gerais
Melhorias de arquitetura e práticas recomendadas.

## Checklist de Segurança
Status de cada item verificado (✅ OK, ❌ Problema, ⚠️ Parcial, ➖ N/A)
```

### 5. Correções

Ao propor correções:

- Forneça o código corrigido pronto para usar, não apenas a descrição
- Explique POR QUE a correção funciona, não apenas O QUE muda
- Considere retrocompatibilidade — a correção não deve quebrar funcionalidade
- Se a correção exigir mudanças arquiteturais, apresente um plano incremental
- Priorize correções que resolvem múltiplos problemas de uma vez

## Referências por Domínio

Para checklists detalhados e padrões de código por domínio, consulte:

- `references/headers-and-config.md` — Headers de segurança, CORS, CSP, cookies, TLS,
  e configuração de infraestrutura
- `references/input-and-injection.md` — Validação de input, XSS, SQL Injection,
  Command Injection, Path Traversal, upload de arquivos, e sanitização
- `references/auth-and-session.md` — Autenticação, autorização, sessões, JWT, CSRF,
  OAuth, senhas, rate limiting, e controle de acesso
- `references/api-security.md` — Segurança de APIs REST e GraphQL, rate limiting,
  validação de schema, versionamento, e proteção de endpoints

Leia a referência relevante quando a análise tocar naquele domínio. Por exemplo, se o
código tem um endpoint REST, leia `references/api-security.md`. Se tem formulários
de login, leia `references/auth-and-session.md`.

## Padrões de Código Seguro por Linguagem

Adapte os conselhos à stack do usuário. Alguns exemplos rápidos:

**JavaScript/TypeScript (Node.js/Express)**
- Use `helmet` para headers de segurança
- Use `csurf` ou tokens CSRF manuais
- Use `express-rate-limit` para rate limiting
- Use queries parametrizadas com seu ORM (Prisma, Sequelize, Knex)
- Sanitize output com bibliotecas como `DOMPurify` (frontend) ou `xss` (backend)
- Evite `eval()`, `Function()`, `child_process.exec()` com input do usuário

**Python (Django/Flask/FastAPI)**
- Django: use o ORM (nunca `raw()` com input), habilite CSRF middleware, configure
  `SECURE_*` settings
- Flask: use `flask-talisman` para headers, `flask-limiter` para rate limiting
- FastAPI: valide com Pydantic, use `Depends()` para auth em cada rota
- Nunca use `os.system()` ou `subprocess.call(shell=True)` com input do usuário

**PHP (Laravel)**
- Use Eloquent ORM (nunca `DB::raw()` com input sem bindings)
- CSRF token automático via `@csrf` em formulários
- Valide com Form Requests
- Use `htmlspecialchars()` ou Blade `{{ }}` (auto-escape) para output

**Java (Spring Boot)**
- Use Spring Security com configuração explícita (não confie nos defaults)
- Use `PreparedStatement` ou JPA/Hibernate para queries
- Habilite CSRF protection (default no Spring Security)
- Configure CORS via `WebMvcConfigurer`, não via `@CrossOrigin("*")`

**Go**
- Use `html/template` (auto-escape) ao invés de `text/template`
- Use queries parametrizadas com `database/sql`
- Valide e sanitize todo input manualmente (Go não tem framework "mágico")
- Configure timeouts em `http.Server` para prevenir slowloris

## Cenários Especiais

**Aplicação legada / código grande**: Priorize os pontos de entrada públicos e fluxos
que lidam com dinheiro ou dados pessoais. Não tente cobrir tudo de uma vez — faça por
módulo, começando pelo mais crítico.

**SPA (React, Vue, Angular)**: O frontend NUNCA é a linha de defesa — toda validação e
autorização DEVE existir no backend. XSS via `dangerouslySetInnerHTML` (React),
`v-html` (Vue), ou `[innerHTML]` (Angular) é especialmente perigoso.

**Aplicação serverless**: Cada função é um ponto de entrada independente. Valide
autenticação e input em CADA função, não assuma que o API Gateway faz tudo.

**Microservices**: Comunicação entre serviços também precisa de autenticação (mTLS ou
tokens de serviço). Não confie em requests só porque vêm da rede interna.

## Princípios que Guiam Toda Análise

1. **Defense in Depth** — Múltiplas camadas de proteção
2. **Least Privilege** — Mínimo acesso necessário
3. **Fail Secure** — Em caso de erro, negue acesso
4. **Don't Trust Input** — Valide tudo que vem de fora
5. **Security by Default** — Configuração padrão deve ser segura
6. **Keep It Simple** — Código complexo esconde vulnerabilidades
7. **Log & Monitor** — Registre eventos de segurança para detecção
8. **Patch Promptly** — Mantenha tudo atualizado
