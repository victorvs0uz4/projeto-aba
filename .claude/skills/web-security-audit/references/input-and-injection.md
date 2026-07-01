# Input Validation e Prevenção de Injeção

Referência detalhada para validação de input, prevenção de XSS, SQL Injection,
Command Injection, Path Traversal, e segurança de upload de arquivos.

## Índice

1. Princípios de Validação de Input
2. Cross-Site Scripting (XSS)
3. SQL Injection
4. Command Injection
5. Path Traversal
6. Upload de Arquivos
7. Server-Side Request Forgery (SSRF)
8. Template Injection

---

## 1. Princípios de Validação de Input

**Regra de ouro: nunca confie em dados que vêm do cliente.**

Validação deve acontecer no servidor. Validação no frontend é UX, não segurança.
Um atacante pode usar curl, Burp Suite, ou modificar o JavaScript para enviar
qualquer coisa.

**Estratégia de validação (nesta ordem):**
1. **Tipo** — É o tipo esperado? (string, número, boolean, data)
2. **Formato** — Corresponde ao padrão esperado? (regex, enum, formato de email)
3. **Comprimento** — Dentro dos limites? (min/max length)
4. **Range** — Dentro do intervalo aceitável? (1-100, datas futuras, etc.)
5. **Sanitização** — Remova ou encode caracteres perigosos PARA O CONTEXTO de uso
6. **Allowlist > Blocklist** — Defina o que é permitido, não tente bloquear o que é
   proibido. Blocklists sempre têm lacunas.

**Exemplo robusto (Node.js com validação):**
```javascript
// BOM — validação explícita com allowlist
const { body, validationResult } = require('express-validator');

app.post('/users',
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 13, max: 150 }),
  body('role').isIn(['user', 'editor']),  // allowlist de valores
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Dados validados, prosseguir com segurança
  }
);
```

```javascript
// RUIM — sem validação, confia no cliente
app.post('/users', (req, res) => {
  db.query(`INSERT INTO users (name, role) VALUES ('${req.body.name}', '${req.body.role}')`);
});
```

---

## 2. Cross-Site Scripting (XSS)

XSS acontece quando input do atacante é renderizado como HTML/JavaScript no navegador
de outro usuário. Existem 3 tipos:

**Stored XSS** (mais perigoso): O payload é salvo no banco e renderizado para todos.
Ex: comentário com `<script>` que rouba cookies de quem visualiza.

**Reflected XSS**: O payload vem na URL/request e é refletido na resposta.
Ex: `?search=<script>alert(1)</script>` renderizado na página de resultados.

**DOM-based XSS**: O payload é processado pelo JavaScript do frontend sem tocar
o servidor. Ex: `document.innerHTML = location.hash`.

**Prevenção:**

A regra fundamental é: **encode a saída de acordo com o contexto**.

| Contexto           | Encoding necessário        | Exemplo                        |
|---------------------|----------------------------|--------------------------------|
| HTML body           | HTML entity encoding       | `&lt;script&gt;`              |
| HTML attribute      | Attribute encoding         | `" onload="alert(1)`→ encode  |
| JavaScript string   | JavaScript encoding        | `\x3cscript\x3e`             |
| URL parameter       | URL encoding               | `%3Cscript%3E`               |
| CSS value           | CSS encoding               | Evite inserir input em CSS    |

**Por framework:**

React: `{ }` faz auto-escape. PERIGO: `dangerouslySetInnerHTML` bypassa isso.
```jsx
// SEGURO — React faz escape automático
<p>{userInput}</p>

// PERIGOSO — nunca com input do usuário sem sanitização
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Se necessário, sanitize primeiro
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

Vue: `{{ }}` faz auto-escape. PERIGO: `v-html` bypassa isso.
```vue
<!-- SEGURO -->
<p>{{ userInput }}</p>

<!-- PERIGOSO -->
<div v-html="userInput"></div>
```

Angular: Sanitiza por padrão. PERIGO: `bypassSecurityTrustHtml()`.

Django: Templates fazem auto-escape. PERIGO: `|safe` e `{% autoescape off %}`.

**Erros comuns que introduzem XSS:**
- Inserir input do usuário em `href="javascript:..."` ou `onclick="..."`
- `eval()` ou `new Function()` com input do usuário
- `document.write()` ou `.innerHTML` com dados não sanitizados
- Template literals no servidor sem encoding
- Mensagens de erro que refletem input (`"Usuário X não encontrado"` sem encoding)

---

## 3. SQL Injection

SQL Injection ocorre quando input do usuário é concatenado diretamente em queries SQL,
permitindo que o atacante modifique a lógica da query.

**Impacto**: Leitura/modificação/exclusão de todo o banco, bypass de autenticação,
execução de comandos no SO (em alguns DBs), exfiltração completa de dados.

**A ÚNICA solução confiável: queries parametrizadas (prepared statements).**

```javascript
// VULNERÁVEL — concatenação de string
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
// Atacante: email = "' OR '1'='1' --"
// Query vira: SELECT * FROM users WHERE email = '' OR '1'='1' --' AND password = ''

// SEGURO — query parametrizada
const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
db.execute(query, [email, hashedPassword]);
```

```python
# VULNERÁVEL
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# SEGURO
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

```php
// VULNERÁVEL
$query = "SELECT * FROM users WHERE id = " . $_GET['id'];

// SEGURO — PDO com prepared statement
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => $_GET['id']]);
```

**Pontos de atenção:**
- ORMs geralmente são seguros, MAS cuidado com queries raw
  (`Model.objects.raw()`, `sequelize.query()`, `DB::raw()`)
- Nomes de tabelas e colunas NÃO PODEM ser parametrizados — use allowlist
- Stored procedures podem ser vulneráveis se concatenam internamente
- LIKE queries: parametrize o valor, escape `%` e `_` se necessário
- ORDER BY com input do usuário: use allowlist de colunas, não parametrize

**Detecção de SQLi no código — busque por:**
- Concatenação de strings em queries (`+`, `f""`, `${}`, `.format()`)
- `raw()`, `rawQuery()`, `query()` com input do usuário
- Queries construídas dinamicamente com condicionais

---

## 4. Command Injection

Ocorre quando input do usuário é passado para um shell do sistema operacional.

```python
# VULNERÁVEL
os.system(f"convert {filename} output.png")
# Atacante: filename = "img.png; rm -rf /"

# SEGURO — use subprocess com lista de argumentos (sem shell)
subprocess.run(["convert", filename, "output.png"], check=True)
```

```javascript
// VULNERÁVEL
exec(`ping ${userHost}`, callback);

// SEGURO — use execFile com argumentos separados
execFile('ping', ['-c', '1', userHost], callback);
```

**Regras:**
- Nunca use `shell=True` (Python), `exec()` (Node.js), `system()` (PHP/Ruby) com input
- Use APIs nativas quando possível (bibliotecas de imagem ao invés de chamar ImageMagick)
- Se precisar do shell, use allowlist estrita de valores permitidos
- Escape não é suficiente — existem bypasses para quase todos os esquemas de escape

---

## 5. Path Traversal

Atacante manipula caminhos de arquivo para acessar arquivos fora do diretório permitido.

```javascript
// VULNERÁVEL
app.get('/files/:name', (req, res) => {
  res.sendFile(path.join('/uploads', req.params.name));
  // Atacante: /files/../../etc/passwd
});

// SEGURO — resolva e valide o caminho
app.get('/files/:name', (req, res) => {
  const basePath = path.resolve('/uploads');
  const filePath = path.resolve(basePath, req.params.name);

  if (!filePath.startsWith(basePath)) {
    return res.status(403).send('Acesso negado');
  }
  res.sendFile(filePath);
});
```

**Regras:**
- Resolva o caminho completo com `path.resolve()` / `os.path.realpath()` ANTES de usar
- Verifique se o caminho resolvido está dentro do diretório permitido
- Nunca confie em `../` filtering — existem encodings alternativos (`..%2f`, `..%5c`)
- Use IDs ou UUIDs para referenciar arquivos, não nomes do filesystem

---

## 6. Upload de Arquivos

Upload de arquivos é uma das superfícies de ataque mais perigosas.

**Checklist de segurança para upload:**
- Valide o tipo MIME do arquivo pelo conteúdo (magic bytes), não pela extensão
- Allowlist de extensões permitidas (`.jpg`, `.png`, `.pdf`) — nunca blocklist
- Limite o tamanho máximo do arquivo
- Renomeie o arquivo com UUID ao salvar (nunca use o nome original)
- Armazene fora do webroot ou em storage externo (S3, GCS)
- Sirva arquivos por um domínio diferente (previne XSS via SVG/HTML)
- Nunca execute o conteúdo do upload
- Scaneie com antivírus se possível
- Remova metadata EXIF de imagens (pode conter GPS, info pessoal)

```javascript
// Exemplo seguro com multer (Node.js)
const upload = multer({
  storage: multer.diskStorage({
    destination: '/secure-uploads/',  // fora do webroot
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Tipo de arquivo não permitido'));
    }
    cb(null, true);
  }
});
```

---

## 7. Server-Side Request Forgery (SSRF)

SSRF ocorre quando a aplicação faz requests HTTP baseadas em input do usuário,
permitindo que o atacante acesse recursos internos.

```python
# VULNERÁVEL — o atacante pode acessar metadata de cloud, serviços internos
response = requests.get(user_provided_url)

# SEGURO — valide a URL contra allowlist
from urllib.parse import urlparse

ALLOWED_HOSTS = {'api.exemplo.com', 'cdn.exemplo.com'}

parsed = urlparse(user_provided_url)
if parsed.hostname not in ALLOWED_HOSTS:
    raise ValueError("Host não permitido")
if parsed.scheme not in ('http', 'https'):
    raise ValueError("Scheme não permitido")

# Resolva DNS e verifique se não é IP privado ANTES de fazer o request
import ipaddress
ip = socket.getaddrinfo(parsed.hostname, None)[0][4][0]
if ipaddress.ip_address(ip).is_private:
    raise ValueError("IP privado não permitido")

response = requests.get(user_provided_url, allow_redirects=False)
```

**Alvos comuns de SSRF:**
- `http://169.254.169.254` — metadata de cloud (AWS/GCP/Azure) com credenciais
- `http://localhost:PORT` — serviços internos
- `file:///etc/passwd` — arquivos locais
- URLs com redirecionamento para IPs internos

---

## 8. Template Injection (SSTI)

Ocorre quando input do usuário é renderizado como template no servidor.

```python
# VULNERÁVEL — Jinja2
template = Template(f"Olá {user_input}")  # user_input = "{{ 7*7 }}" → "Olá 49"

# SEGURO — passe variáveis separadamente
template = Template("Olá {{ name }}")
template.render(name=user_input)
```

**Detecção:** Busque por construção dinâmica de templates com input do usuário.
Em Jinja2, teste com `{{ 7*7 }}` — se renderiza `49`, é vulnerável.
