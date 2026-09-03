import quopri, re, pathlib

SRC = pathlib.Path(r"C:\Users\yo\repo\livestock-desktop\Validación Piel ERP.mhtml")
DST = pathlib.Path(r"C:\Users\yo\repo\livestock-desktop\frontend\validacion-piel-erp.html")
raw = SRC.read_bytes()

# --- 1) Extract the artifact HTML part (the one that links css-5af24a09) ---
marker = b'cid:css-5af24a09-7b49-46b2-8636-a8b67a08e1b6@mhtml.blink'
i = raw.find(marker)
assert i != -1, "artifact marker not found"
start = raw.rfind(b'<!DOCTYPE html>', 0, i)
end = raw.find(b'</body></html>', start) + len(b'</body></html>')
artifact_qp = raw[start:end]
artifact_html = quopri.decodestring(artifact_qp).decode('utf-8')

# --- 2) Extract the design CSS part (css-332485f5) ---
cssid = b'cid:css-332485f5-8e3c-4e28-881d-4a796878812b@mhtml.blink'
c = raw.find(cssid)
assert c != -1, "design css not found"
sep = raw.find(b'\r\n\r\n', c)
if sep == -1:
    sep = raw.find(b'\n\n', c)
css_start = sep + (4 if raw[sep:sep+4] == b'\r\n\r\n' else 2)
boundary = b'MultipartBoundary--9DMFK6gF7DwgRQc6UpICQBvOiBK7NB2K6z67Yd72Ul'
css_end = raw.find(boundary, css_start)
css_qp = raw[css_start:css_end]
design_css = quopri.decodestring(css_qp).decode('utf-8')

# --- 3) Pull the body content (the wrap block) out of the artifact ---
m = re.search(r'<body>(.*)</body>', artifact_html, re.S)
body = m.group(1)
# drop the stray <title> sitting inside <body> and the frame-runtime base tag
body = re.sub(r'<title>.*?</title>\s*', '', body, count=1, flags=re.S)
body = re.sub(r'<!-- frame-runtime -->.*?</base>\s*', '', body, flags=re.S)

# basic sanity: count checkboxes
nboxes = body.count('type="checkbox"')
print("checkboxes found:", nboxes)

JS = r"""
(function () {
  var KEY = 'validacion-piel-erp-v1';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox][data-idx]'));
  var cuenta = document.getElementById('cuenta');
  var relleno = document.getElementById('relleno');
  var reset = document.getElementById('reset');
  var total = boxes.length;
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }
  function update() {
    var done = 0;
    for (var k = 0; k < boxes.length; k++) { if (boxes[k].checked) done++; }
    if (cuenta) cuenta.textContent = done + ' / ' + total;
    if (relleno) relleno.style.width = (total ? (done / total * 100) : 0) + '%';
  }

  boxes.forEach(function (b) {
    var idx = b.getAttribute('data-idx');
    if (store[idx]) b.checked = true;
    b.addEventListener('change', function () {
      if (b.checked) store[idx] = 1; else delete store[idx];
      save(); update();
    });
  });

  if (reset) reset.addEventListener('click', function () {
    for (var k = 0; k < boxes.length; k++) { boxes[k].checked = false; }
    store = {}; save(); update();
  });

  update();
})();
"""

html = (
    "<!DOCTYPE html>\n"
    '<html lang="es">\n'
    "<head>\n"
    '  <meta charset="utf-8">\n'
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "  <title>Validación Piel ERP</title>\n"
    "  <style>\n"
    + design_css.strip()
    + "\n  </style>\n"
    "</head>\n"
    "<body>\n"
    + body.strip()
    + "\n  <script>\n"
    + JS.strip()
    + "\n  </script>\n"
    "</body>\n"
    "</html>\n"
)

DST.write_text(html, encoding='utf-8')
print("written ->", DST)
print("bytes:", len(html.encode('utf-8')))
