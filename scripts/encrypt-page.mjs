import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { webcrypto } from 'node:crypto';

const [source, target, user, password] = process.argv.slice(2);
if (!password) throw new Error('Usage: node scripts/encrypt-page.mjs <source.html> <target.html> <user> <password>');

const { subtle } = webcrypto;
const iterations = 600_000;
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

const material = await subtle.importKey('raw', new TextEncoder().encode(`${user}\n${password}`), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const plain = gzipSync(await readFile(source), { level: 9 });
const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
const payload = JSON.stringify({ salt: b64(salt), iv: b64(iv), iterations, data: b64(data) });

// The page only ever holds ciphertext; the original HTML is rebuilt in the browser after a correct login.
const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>需要登录</title>
<style>
  :root { color-scheme: light; font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f5f4; color: #1c1917; }
  form { width: min(320px, calc(100vw - 48px)); padding: 28px; background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / 6%); display: grid; gap: 14px; }
  h1 { margin: 0 0 4px; font-size: 18px; }
  p { margin: 0; font-size: 13px; color: #78716c; }
  label { display: grid; gap: 6px; font-size: 13px; }
  input { font: inherit; padding: 9px 11px; border: 1px solid #d6d3d1; border-radius: 8px; }
  input:focus { outline: 2px solid #ea580c; outline-offset: -1px; border-color: transparent; }
  button { font: inherit; padding: 10px; border: 0; border-radius: 8px; background: #1c1917; color: #fff; cursor: pointer; }
  button:disabled { opacity: .6; cursor: progress; }
  #msg { min-height: 1.2em; color: #b91c1c; }
</style>
</head>
<body>
<form id="login" autocomplete="on">
  <h1>需要登录</h1>
  <p>这个页面的内容已加密，登录后在浏览器本地解密显示。</p>
  <label>账号<input name="user" autocomplete="username" required autofocus></label>
  <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
  <button>登录</button>
  <p id="msg" role="alert"></p>
</form>
<script>
const P = ${payload};
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const slot = 'page-key:' + location.pathname;
const form = document.getElementById('login');
const msg = document.getElementById('msg');

async function derive(user, password) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(user + '\\n' + password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(P.salt), iterations: P.iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}

async function show(key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(P.iv) }, key, bytes(P.data));
  const html = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  sessionStorage.setItem(slot, btoa(String.fromCharCode(...raw)));
  document.open();
  document.write(html);
  document.close();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  msg.textContent = '';
  try {
    await show(await derive(form.user.value, form.password.value));
  } catch {
    msg.textContent = '账号或密码不对';
    button.disabled = false;
  }
});

const saved = sessionStorage.getItem(slot);
if (saved) {
  crypto.subtle.importKey('raw', bytes(saved), 'AES-GCM', true, ['decrypt']).then(show).catch(() => sessionStorage.removeItem(slot));
}
</script>
</body>
</html>
`;

await mkdir(dirname(target), { recursive: true });
await writeFile(target, page);
console.log(`${target}: ${(page.length / 1024).toFixed(0)} KB (source ${(plain.length / 1024).toFixed(0)} KB gzipped)`);
