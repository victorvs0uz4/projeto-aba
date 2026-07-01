# Autenticação, Autorização e Sessões

Referência detalhada para autenticação segura, gerenciamento de sessões, JWT,
CSRF, OAuth, controle de acesso, e proteção de senhas.

## Índice

1. Hashing de Senhas
2. Autenticação Segura
3. Gerenciamento de Sessões
4. JSON Web Tokens (JWT)
5. CSRF (Cross-Site Request Forgery)
6. OAuth 2.0 e OpenID Connect
7. Controle de Acesso e Autorização
8. Rate Limiting e Brute Force
9. Multi-Factor Authentication (MFA)

---

## 1. Hashing de Senhas

Senhas NUNCA devem ser armazenadas em texto plano ou com hashes fracos.

**Algoritmos aceitáveis (em ordem de preferência):**
1. **Argon2id** — vencedor do Password Hashing Competition, resistente a GPU/ASIC
2. **bcrypt** — maduro e amplamente suportado, custo ajustável
3. **scrypt** — resistente a hardware especializado

**NUNCA use:** MD5, SHA1, SHA256, SHA512 (sozinhos), DES, ou qualquer hash rápido.
Hashes rápidos permitem bilhões de tentativas por segundo.

```javascript
// Node.js com bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;  // Mínimo 10, ideal 12+

// Criar hash
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verificar
const match = await bcrypt.compare(password, hash);
```

```python
# Python com bcrypt
import bcrypt

# Criar hash
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# Verificar — use comparação de tempo constante
is_valid = bcrypt.checkpw(password.encode(), hashed)
```

**Regras:**
- Salt único por senha (bcrypt/Argon2 fazem isso automaticamente)
- Work factor alto o suficiente para levar ~250ms por hash
- Nunca implemente seu próprio hashing — use bibliotecas estabelecidas
- Atualize o work factor periodicamente conforme hardware fica mais rápido
- Considere peppering (secret adicional no servidor) para defesa extra

---

## 2. Autenticação Segura

**Mensagens de erro genéricas:**
```
// RUIM — revela se o email existe
"Senha incorreta para user@exemplo.com"
"Este email não está cadastrado"

// BOM — não diferencia email inexistente de senha errada
"Email ou senha incorretos"
```
Isso previne enumeração de usuários. Aplique timing constante (responda no mesmo
tempo se o usuário existe ou não) para prevenir timing attacks.

**Fluxo de recuperação de senha seguro:**
1. Usuário informa email
2. Responda SEMPRE com "Se este email existir, enviaremos instruções" (não revele)
3. Gere token criptograficamente seguro com expiração curta (15-60 min)
4. Envie link por email (HTTPS obrigatório)
5. Token de uso único — invalide após uso ou expiração
6. Exija a nova senha e confirmação
7. Invalide todas as sessões existentes após troca de senha
8. Notifique o usuário sobre a troca por email

**Política de senha:**
- Mínimo 8 caracteres (NIST recomenda mínimo 8, ideal 12+)
- Sem máximo irrazoável (limite em 128 chars é suficiente)
- NÃO exija complexidade artificial (maiúscula + número + símbolo) — NIST 800-63B
  recomenda contra isso pois leva a padrões previsíveis como "Password1!"
- Verifique contra listas de senhas vazadas (HaveIBeenPwned API)
- Verifique contra senhas comuns (top 10000)

---

## 3. Gerenciamento de Sessões

**Geração de session ID:**
- Use geradores criptograficamente seguros do framework
- Entropia mínima de 128 bits
- Nunca exponha session ID na URL
- Regenere session ID após login (prevenção de session fixation)
- Invalide session no logout (destrua no servidor, não apenas apague o cookie)

```javascript
// Express com express-session
app.use(session({
  secret: process.env.SESSION_SECRET,  // string aleatória longa
  name: '__Host-session',  // prefixo __Host- para segurança extra
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 3600000,  // 1 hora
    path: '/'
  },
  store: redisStore  // NUNCA use MemoryStore em produção
}));

// Regenerar após login
app.post('/login', (req, res) => {
  // ... autenticar ...
  req.session.regenerate((err) => {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });
});
```

**Expiração:**
- Timeout absoluto: sessão expira após tempo máximo (ex: 8 horas)
- Timeout de inatividade: sessão expira após período sem atividade (ex: 30 min)
- Para operações sensíveis: exija re-autenticação (senha ou MFA)

---

## 4. JSON Web Tokens (JWT)

JWT é útil para APIs stateless, mas tem armadilhas sérias se mal configurado.

**Vulnerabilidades comuns de JWT:**

**1. Algorithm None**
```javascript
// VULNERÁVEL — aceita tokens sem assinatura
jwt.verify(token, secret);  // Se o token tem alg: "none", pode ser forjado

// SEGURO — especifique algoritmos permitidos
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

**2. Confusão de algoritmo (RS256 → HS256)**
Se o servidor usa RS256 (assimétrico), o atacante pode criar um token HS256
usando a chave pública como secret. Sempre especifique o algoritmo esperado.

**3. Secret fraco**
```javascript
// RUIM
const secret = 'secret123';

// BOM — secret longo e aleatório
const secret = crypto.randomBytes(64).toString('hex');
```

**4. Token sem expiração**
```javascript
// RUIM
jwt.sign({ userId: 123 }, secret);

// BOM — sempre defina expiração
jwt.sign({ userId: 123 }, secret, {
  expiresIn: '1h',
  issuer: 'app.exemplo.com',
  audience: 'api.exemplo.com'
});
```

**Checklist JWT:**
- Especifique algoritmo explicitamente na verificação
- Use secret forte (256+ bits para HMAC, 2048+ bits para RSA)
- Defina `exp` (expiração) curta (15 min para access token)
- Defina `iss` (issuer) e `aud` (audience) e valide ambos
- Use refresh tokens para renovação (mais longos, armazenados com segurança)
- Não armazene dados sensíveis no payload (é apenas base64, não criptografado)
- Implemente blocklist de tokens para logout/revogação
- JWTs em cookies HttpOnly são mais seguros que localStorage

---

## 5. CSRF (Cross-Site Request Forgery)

CSRF engana o navegador do usuário autenticado a fazer requisições indesejadas.

**Prevenção:**

**Synchronizer Token Pattern:**
```html
<!-- No formulário -->
<form method="POST" action="/transfer">
  <input type="hidden" name="_csrf" value="{{ csrf_token }}">
  <!-- ... -->
</form>
```
O token é gerado no servidor, vinculado à sessão, e validado em cada POST.

**Double Submit Cookie (para SPAs):**
```javascript
// Servidor gera e envia cookie CSRF
res.cookie('csrf-token', csrfToken, { httpOnly: false, sameSite: 'strict' });

// Frontend lê o cookie e envia como header
fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-CSRF-Token': getCookie('csrf-token') }
});

// Servidor compara cookie com header
```

**SameSite cookies:**
`SameSite=Lax` ou `Strict` previne CSRF na maioria dos navegadores modernos,
mas não substitui tokens CSRF — use ambos para defesa em profundidade.

**Operações que precisam de proteção CSRF:**
- Qualquer request que muda estado (POST, PUT, DELETE, PATCH)
- GET requests que causam side effects (mal-design, mas existem)
- Requisições AJAX com cookies/sessão

---

## 6. OAuth 2.0 e OpenID Connect

**Erros comuns em implementações OAuth:**
- Não validar `state` parameter → vulnerável a CSRF
- Redirect URI muito permissivo → token pode ser roubado via redirecionamento
- Armazenar tokens em localStorage → vulnerável a XSS
- Não validar `id_token` do OIDC adequadamente

**Checklist:**
- Use Authorization Code Flow + PKCE (mesmo para SPAs)
- Implicit Flow está depreciado — não use
- Valide `state` em CADA callback para prevenir CSRF
- Redirect URI com match exato (não use wildcards)
- Armazene tokens no backend ou em cookies HttpOnly
- Valide `nonce` em tokens OIDC
- Solicite apenas scopes necessários (princípio de menor privilégio)

---

## 7. Controle de Acesso e Autorização

**IDOR (Insecure Direct Object Reference):**
```javascript
// VULNERÁVEL — qualquer usuário pode ver dados de outro
app.get('/api/users/:id/orders', (req, res) => {
  const orders = await Order.findAll({ where: { userId: req.params.id } });
  res.json(orders);
});

// SEGURO — verifica propriedade do recurso
app.get('/api/users/:id/orders', auth, (req, res) => {
  if (req.user.id !== parseInt(req.params.id) && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const orders = await Order.findAll({ where: { userId: req.params.id } });
  res.json(orders);
});
```

**Princípios:**
- Autorização no SERVIDOR, em CADA endpoint (não apenas na UI)
- Verifique permissão no recurso específico, não apenas na role
- Use UUIDs ao invés de IDs sequenciais para dificultar enumeração
- Negue por padrão — acesso deve ser explicitamente concedido
- Log de tentativas de acesso não autorizado para detecção

**Escalação de privilégio:**
- Nunca confie em campos editáveis pelo cliente para determinar role
  ```javascript
  // VULNERÁVEL — atacante pode enviar role: "admin" no body
  const user = await User.create(req.body);

  // SEGURO — whitelist de campos permitidos
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: 'user'  // Sempre força o default
  });
  ```
- Verifique role/permissão no servidor para cada operação
- Endpoints admin devem ter middleware de autorização separado

---

## 8. Rate Limiting e Proteção contra Brute Force

**Onde aplicar rate limiting:**
- Login: 5-10 tentativas por conta por 15 minutos
- Recuperação de senha: 3-5 requests por email por hora
- Registro: 3-5 por IP por hora
- API geral: depende do caso, mas 100-1000 req/min por chave é razoável
- Endpoints sensíveis: limite mais agressivo

```javascript
// Express com express-rate-limit
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip,  // Por conta, não só IP
});

app.post('/login', loginLimiter, loginHandler);
```

**Lockout progressivo:**
- 5 tentativas falhas → lock 15 minutos
- 10 tentativas → lock 1 hora
- 20 tentativas → lock 24 horas + alerta
- Notifique o dono da conta sobre tentativas repetidas

**CAPTCHA:**
- Use reCAPTCHA v3 ou hCaptcha após N tentativas falhas
- Não exija CAPTCHA na primeira tentativa (UX)
- CAPTCHA no registro para prevenir criação automatizada de contas

---

## 9. Multi-Factor Authentication (MFA)

**Implementação segura de TOTP (Time-based OTP):**
- Use biblioteca consolidada (speakeasy, pyotp, etc.)
- Secret de 160+ bits, gerado com CSPRNG
- Aceite window de ±1 intervalo (30 segundos de tolerância)
- Permita e incentive backup codes (8-10 códigos de uso único)
- Armazene secret com criptografia (é essencialmente uma senha)

**Recovery:**
- Backup codes: gere 10, armazene hasheados, cada um de uso único
- Não permita desabilitar MFA por email sozinho — exija pelo menos 2 fatores
- Processo de recuperação sem MFA deve ser lento e com verificação humana

**Onde exigir MFA (pelo menos oferecer):**
- Contas admin
- Troca de senha/email
- Operações financeiras
- Acesso a dados sensíveis de outros usuários
- Configurações de segurança da conta
