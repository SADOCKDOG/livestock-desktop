# Instalar MSIX firmado con certificado autofirmado
# 1. Añadir certificado al almacén Root de confianza
certutil -addstore -f Root "C:\Users\yo\repo\livestock-desktop\firma-trusted.cer"
Write-Host "Certificado añadido a Trusted Root"

# 2. Instalar el MSIX
Add-AppxPackage -Path "C:\Users\yo\repo\livestock-desktop\src-tauri\target\msix\Livestock Manager PREMIUM_4.11.24.0.msixbundle"
Write-Host "MSIX instalado"