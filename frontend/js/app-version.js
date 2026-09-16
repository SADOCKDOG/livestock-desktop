// Version del paquete MSIX de escritorio. Se preserva en sync-from-master.ps1
// porque el maestro trae aqui la version de Android, que es otra numeracion.
// Al subir la version hay que tocar Cargo.toml, tauri.conf.json y este fichero.
window.APP_INFO = Object.freeze({
  version: '4.11.9',
  versionCode: 533
});