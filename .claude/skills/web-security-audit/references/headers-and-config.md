# Headers de Segurança e Configuração

Referência detalhada para headers HTTP de segurança, configuração de CORS, CSP,
cookies, e infraestrutura.

## Índice

1. Headers HTTP de Segurança
2. Content Security Policy (CSP)
3. CORS (Cross-Origin Resource Sharing)
4. Cookies Seguros
5. TLS/HTTPS
6. Configuração de Servidor

---

## 1. Headers HTTP de Segurança

Verifique se estes headers estão presentes nas respostas HTTP:

**Strict-Transport-Security (HSTS)**
Força o navegador a usar HTTPS. Sem isso, um atacante pode fazer downgrade para HTTP.
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- `max-age` mínimo de 1 ano (31536000 segundos) para preload lists
- `includeSubDomains` protege todos os subdomínios
- `preload` permite inclusão na lista de preload dos navegadores

**X-Content-Type-Options**
Previne MIME type sniffing, que pode transformar um arquivo não-executável em executável.
```
X-Content-Type-Options: nosniff
```

**X-Frame-Options**
Protege contra clickjacking. CSP `frame-ancestors` é mais moderno, mas este header
garante compatibilidade.
```
X-Frame-Options: DENY
```
Use `SAMEORIGIN` se a aplicação usa iframes do próprio domínio.

**Referrer-Policy**
Controla quanta informação de referência é enviada em navegações.
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Permissions-Policy**
Restringe acesso a APIs do navegador (câmera, microfone, geolocalização, etc.).
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```
Liste apenas as features que a aplicação realmente usa.

**X-XSS-Protection**
Embora depreciado em navegadores modernos, ainda útil para navegadores antigos.
```
X-XSS-Protection: 0
```
Valor `0` é recomendado atualmente porque o filtro XSS dos navegadores pode
introduzir vulnerabilidades. Prefira CSP para proteção XSS.

**Cache-Control para páginas sensíveis**
Páginas com dados pessoais ou financeiros não devem ser cacheadas.
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
```

---

## 2. Content Security Policy (CSP)

CSP é a defesa mais poderosa contra XSS. Funciona como um allowlist de origens
de conteúdo permitidas.

**CSP mínimo recomendado:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Regras importantes:**
- Nunca use `'unsafe-inline'` para scripts — use nonces ou hashes
- Nunca use `'unsafe-eval'` — elimine `eval()` do código
- `'self'` é preferível a listar domínios quando possível
- Use `report-uri` ou `report-to` para monitorar violações
- Comece com `Content-Security-Policy-Report-Only` para testar sem quebrar

**Exemplo com nonce (para scripts inline necessários):**
```
Content-Security-Policy: script-src 'self' 'nonce-{random}';
```
O nonce deve ser um valor aleatório gerado por request no servidor.

**Erros comuns de CSP:**
- `script-src *` — permite scripts de qualquer origem, anula o propósito
- `default-src 'self' 'unsafe-inline' 'unsafe-eval'` — falsa sensação de segurança
- CSP muito permissivo por "conveniência" — cada exceção é uma porta aberta
- Não incluir `frame-ancestors` — deixa a aplicação vulnerável a clickjacking

---

## 3. CORS (Cross-Origin Resource Sharing)

CORS controla quais origens podem fazer requisições cross-origin à sua API.

**Configuração segura:**
```
Access-Control-Allow-Origin: https://app.exemplo.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

**Vulnerabilidades comuns:**
- `Access-Control-Allow-Origin: *` — permite qualquer site fazer requisições.
  NUNCA use com `Access-Control-Allow-Credentials: true`
- Refletir o header `Origin` da request sem validação — equivale a `*` mas pior
  porque permite credenciais
- Validação de origin com `startsWith` ou `includes` ao invés de match exato —
  um atacante pode registrar `exemplo.com.evil.com`

**Padrão seguro para validação de origin:**
```javascript
const allowedOrigins = new Set([
  'https://app.exemplo.com',
  'https://admin.exemplo.com'
]);

if (allowedOrigins.has(request.headers.origin)) {
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
}
```
Use Set para lookup O(1) e match exato.

---

## 4. Cookies Seguros

**Flags obrigatórias para cookies de sessão:**
```
Set-Cookie: session=abc123;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=3600;
  Domain=exemplo.com
```

- `HttpOnly` — impede acesso via JavaScript (proteção contra XSS roubar sessão)
- `Secure` — cookie só é enviado por HTTPS
- `SameSite=Lax` — protege contra CSRF na maioria dos cenários. Use `Strict` para
  cookies de alta segurança (mas pode afetar UX com links externos)
- `Path=/` — escopo do cookie (evite `/` se possível, limite ao necessário)
- `Max-Age` ou `Expires` — defina expiração explícita

**Erros comuns:**
- Cookie de sessão sem `HttpOnly` — XSS pode roubar a sessão
- Cookie sem `Secure` — pode ser interceptado em HTTP
- `SameSite=None` sem necessidade — remove proteção CSRF
- Cookie com dados sensíveis (ID do usuário, role) sem assinatura/criptografia

---

## 5. TLS/HTTPS

- HTTPS obrigatório em todos os ambientes (incluindo staging)
- Redirecionamento automático HTTP → HTTPS (301 permanente)
- TLS 1.2+ apenas (desabilite SSL 3.0, TLS 1.0, TLS 1.1)
- Cipher suites modernas (ECDHE + AES-GCM ou ChaCha20)
- Certificado válido e renovado automaticamente (Let's Encrypt)
- HSTS habilitado (ver seção 1)

**Teste a configuração TLS:**
- Use ferramentas como SSL Labs (ssllabs.com/ssltest) para verificar nota A/A+
- Verifique se não há mixed content (HTTP dentro de HTTPS)

---

## 6. Configuração de Servidor

**Informações expostas:**
- Remova ou ofusque headers que revelam tecnologia:
  `Server`, `X-Powered-By`, `X-AspNet-Version`
- Desabilite directory listing
- Remova páginas default do servidor (Apache default page, Nginx welcome, etc.)
- Customize páginas de erro (404, 500) sem revelar stack traces

**Ambientes:**
- `DEBUG=false` em produção (Django, Express, etc.)
- Logs de erro em arquivo, nunca na resposta HTTP
- Variáveis de ambiente para configuração sensível
- Ambientes de dev/staging isolados e não acessíveis publicamente

**Rate Limiting no servidor (Nginx):**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
}
```
