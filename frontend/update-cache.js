const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, path) => {
    if (!path.startsWith('js/')) return match;
    const base = path.split('?')[0];
    return `<script src="${base}?v=6.14"></script>`;
});
fs.writeFileSync('index.html', html);
console.log('Cache busters updated');
