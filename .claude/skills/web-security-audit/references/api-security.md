# Segurança de APIs

Referência detalhada para segurança de APIs REST, GraphQL, rate limiting,
validação de schema, e proteção de endpoints.

## Índice

1. Princípios de Segurança de API
2. Autenticação de API
3. Validação de Input em APIs
4. GraphQL Security
5. Rate Limiting e Throttling
6. Versionamento e Deprecação
7. Logging e Monitoramento
8. Error Handling Seguro
9. Checklist de API Security

---

## 1. Princípios de Segurança de API

APIs são a superfície de ataque mais exposta de aplicações modernas. Diferente de
interfaces web, APIs são consumidas programaticamente, o que significa que atacantes
podem automatizar ataques facilmente.

**Princípios fundamentais:**
- Autentique TODA request (exceto endpoints públicos explícitos)
- Autorize acesso ao recurso específico, não apenas à rota
- Valide todo input contra um schema definido
- Retorne apenas os dados necessários (não exponha campos internos)
- Use HTTPS obrigatoriamente
- Implemente rate limiting por identidade (API key, user, IP)
- Versione sua API para permitir mudanças sem quebrar segurança
- Log todo acesso para auditoria

---

## 2. Autenticação de API

**API Keys:**
- Para identificação de aplicação/cliente, não de usuário
- Transmita via header (`X-API-Key` ou `Authorization`), NUNCA na URL
- URLs ficam em logs de servidor, histórico do navegador, referrer headers
- Rotacione periodicamente e permita revogação imediata
- Associe permissões/scopes a cada key

**Bearer Tokens (JWT/OAuth):**
- Transmita via `Authorization: Bearer <token>`
- Valide assinatura, expiração, issuer, audience em CADA request
- Tokens de curta duração (15 min) + refresh tokens
- Não armazene em localStorage (vulnerável a XSS)

**Mutual TLS (mTLS):**
- Para comunicação serviço-a-serviço
- Ambos os lados apresentam certificado
- Mais seguro que tokens para service mesh

**O que NUNCA fazer:**
- Autenticação via query string (`?api_key=xxx`)
- Credenciais de banco na API response
- Aceitar tokens expirados
- Permitir API sem autenticação "temporariamente"

---

## 3. Validação de Input em APIs

**Valide contra schema, não com lógica ad-hoc:**

```javascript
// Node.js com Joi
const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(13).max(150),
  preferences: Joi.object({
    newsletter: Joi.boolean(),
    theme: Joi.string().valid('light', 'dark')
  })
}).options({ stripUnknown: true });  // Remove campos não declarados

app.post('/api/users', (req, res) => {
  const { error, value } = createUserSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // 'value' contém dados validados e sanitizados
});
```

```python
# FastAPI com Pydantic (validação automática)
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class CreateUser(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    age: Optional[int] = Field(None, ge=13, le=150)

    class Config:
        extra = "forbid"  # Rejeita campos não declarados

@app.post("/api/users")
async def create_user(user: CreateUser):
    # Pydantic já validou; 'user' é seguro
    pass
```

**Proteção contra Mass Assignment:**
- Defina explicitamente quais campos o usuário pode enviar
- `stripUnknown` (Joi), `extra = "forbid"` (Pydantic), strong parameters (Rails)
- Nunca passe `req.body` diretamente para `Model.create()`

**Validação de query parameters:**
- Paginação: valide `page` e `limit` como inteiros positivos com máximo
- Filtros: allowlist de campos filtráveis
- Ordenação: allowlist de campos ordenáveis

---

## 4. GraphQL Security

GraphQL tem vulnerabilidades específicas que REST não tem.

**Query depth limiting:**
```javascript
// Sem limite, atacante pode fazer queries aninhadas infinitas
// { user { friends { friends { friends { ... } } } } }

const depthLimit = require('graphql-depth-limit');
const server = new ApolloServer({
  validationRules: [depthLimit(5)]
});
```

**Query complexity/cost analysis:**
```javascript
// Limite o custo computacional de queries
const costAnalysis = require('graphql-cost-analysis');
// Cada campo tem um custo, e queries acima do limite são rejeitadas
```

**Batching attacks:**
- Limite o número de queries em um batch
- Desabilite batching se não for necessário

**Introspection:**
```javascript
// DESABILITE em produção — expõe todo o schema
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production'
});
```

**N+1 e DoS:**
- Use DataLoader para prevenir N+1 queries (performance + segurança)
- Implemente timeout por query
- Limite o número de resultados retornados (paginação obrigatória)

**Field-level authorization:**
```javascript
// Cada campo sensível deve ter sua própria verificação de permissão
const resolvers = {
  User: {
    email: (parent, args, context) => {
      if (context.user.id !== parent.id && !context.user.isAdmin) {
        return null;  // Ou throw AuthorizationError
      }
      return parent.email;
    }
  }
};
```

---

## 5. Rate Limiting e Throttling

**Estratégias de rate limiting para API:**

**Fixed Window:**
Simples mas tem problema de burst na borda da janela.
```
100 requests per minute
```

**Sliding Window (recomendado):**
Mais suave e justo.
```
100 requests em qualquer janela de 60 segundos
```

**Token Bucket:**
Permite bursts controlados.
```
Bucket de 100 tokens, refill de 10 tokens/segundo
```

**Headers de resposta padrão (RFC 6585):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1625097600
Retry-After: 30
```

**Quando rate limitar:**
- Por API key/user para endpoints autenticados
- Por IP para endpoints públicos (login, registro)
- Rate limits mais agressivos para operações caras (search, export)
- Rate limits separados para diferentes tiers (free, pro, enterprise)

**Response quando limitado:**
```json
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retry_after": 30
}
```

---

## 6. Versionamento e Deprecação

- Versione via URL (`/api/v1/`) ou header (`Accept: application/vnd.api+json;v=1`)
- Mantenha versões antigas seguras — não são "abandonadas" porque são velhas
- Comunique deprecação com headers: `Deprecation: true`, `Sunset: <date>`
- Dê prazo razoável antes de desligar versões antigas
- Documente breaking changes que afetam segurança

---

## 7. Logging e Monitoramento

**O que logar:**
- Todas as tentativas de autenticação (sucesso e falha)
- Tentativas de acesso não autorizado (403)
- Erros de validação de input (possível probing)
- Operações em dados sensíveis (CRUD em PII)
- Rate limiting ativado
- Mudanças em configurações de segurança

**O que NUNCA logar:**
- Senhas (nem hash)
- Tokens de sessão/API completos (log apenas últimos 4 chars)
- Dados de cartão de crédito
- PII desnecessária
- Dados de saúde
- Segredos ou chaves de criptografia

**Formato de log estruturado:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "warn",
  "event": "auth_failure",
  "ip": "192.168.1.100",
  "user_id": "usr_abc123",
  "endpoint": "POST /api/login",
  "reason": "invalid_password",
  "attempt_count": 3
}
```

**Alertas automatizados para:**
- Muitas falhas de autenticação do mesmo IP/conta
- Padrões de scanning (requests rápidos para endpoints inexistentes)
- Spike de erros 500 (possível ataque ou bug crítico)
- Acesso a endpoints admin de IPs desconhecidos

---

## 8. Error Handling Seguro

**Regra: erros internos ficam nos logs, não na resposta.**

```javascript
// RUIM — expõe detalhes internos
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    query: err.sql  // NUNCA exponha queries SQL
  });
});

// BOM — mensagem genérica, detalhes no log
app.use((err, req, res, next) => {
  const errorId = uuidv4();
  logger.error({ errorId, err, req: { method: req.method, url: req.url } });

  res.status(500).json({
    error: 'Erro interno do servidor',
    reference: errorId  // Para o usuário reportar
  });
});
```

**Respostas de erro por status:**
- `400` — Erro de validação: diga QUAL campo é inválido (sem detalhes internos)
- `401` — Não autenticado: "Autenticação necessária" (sem dizer o motivo)
- `403` — Não autorizado: "Acesso negado" (sem revelar se o recurso existe)
- `404` — Não encontrado: use 404 também para recurso que existe mas o user não
  tem acesso (para não revelar existência via 403 vs 404)
- `429` — Rate limited: inclua `Retry-After`
- `500` — Erro interno: mensagem genérica + ID de referência

---

## 9. Checklist de API Security

Use este checklist para verificar cada endpoint:

```
Autenticação
  [ ] Todas as rotas exigem autenticação (exceto as públicas explícitas)
  [ ] Tokens validados completamente (assinatura, exp, iss, aud)
  [ ] API keys transmitidas via header, não URL

Autorização
  [ ] Cada endpoint verifica permissão no recurso específico
  [ ] IDOR prevenido (verificação de propriedade)
  [ ] Endpoints admin protegidos com role check

Input
  [ ] Todo input validado contra schema
  [ ] Mass assignment prevenido (whitelist de campos)
  [ ] Paginação com limite máximo
  [ ] Query parameters validados

Output
  [ ] Apenas campos necessários retornados
  [ ] Dados sensíveis mascarados/omitidos conforme permissão
  [ ] Erros sem detalhes internos

Infraestrutura
  [ ] HTTPS obrigatório
  [ ] Rate limiting ativo por identidade
  [ ] CORS configurado restritivamente
  [ ] Headers de segurança presentes
  [ ] Logging de acesso e erros

GraphQL (se aplicável)
  [ ] Introspection desabilitada em produção
  [ ] Depth limiting configurado
  [ ] Complexity analysis ativo
  [ ] Field-level authorization implementada
```
