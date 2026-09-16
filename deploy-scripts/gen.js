const fs = require('fs');
const script = fs.readFileSync('C:/Users/yo/.claude/projects/c--Users-yo-repo-livestock-desktop/worker-updated.js', 'utf8').replace(/\r/g, '');
const code = `(async () => { const script = ${JSON.stringify(script)}; return cloudflare.request({ method: 'PUT', path: '/accounts/3fb23c4a20ab113350d8ee4fa7be0acb/workers/scripts/interpretar-coleccion', body: script, rawBody: true, contentType: 'application/javascript' }); })();`;
fs.writeFileSync('C:/Users/yo/repo/livestock-desktop/temp_code.txt', code);