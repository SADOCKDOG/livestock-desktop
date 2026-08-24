# _ocr_screens.ps1 — Extrae texto de las capturas de Play Console con el OCR de
# Windows (Windows.Media.Ocr) para identificar que modulo muestra cada una.
# Uso: pwsh scripts/_ocr_screens.ps1 "<carpeta>"

param(
    [Parameter(Mandatory = $true)]
    [string]$Folder
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Helper Await: convierte IAsyncOperation de WinRT en Task y espera el resultado.
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

# Cargar tipos WinRT necesarios.
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]

# Motor OCR: primero espanol, si no el del perfil del usuario.
$engine = $null
try {
    $lang = New-Object Windows.Globalization.Language('es-ES')
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
} catch { }
if (-not $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if (-not $engine) {
    Write-Output '[OCR] ERROR: no hay motor OCR disponible'
    exit 1
}
Write-Output ('[OCR] motor: ' + $engine.RecognizerLanguage.LanguageTag)

Get-ChildItem -LiteralPath $Folder -Filter *.png |
    Where-Object { $_.Name -notmatch 'poster' } |
    Sort-Object Name |
    ForEach-Object {
        try {
            $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
            $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
            $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
            $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
            $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            $stream.Dispose()
            $bitmap.Dispose()
            # Primeras lineas con contenido (cabecera de pantalla suele bastar).
            $lines = @($result.Lines | Where-Object { $_.Text.Trim().Length -gt 0 } | Select-Object -First 14 |
                ForEach-Object { $_.Text.Trim() })
            Write-Output ('===== ' + $_.Name + ' =====')
            $lines -join ' | '
        } catch {
            Write-Output ('===== ' + $_.Name + ' =====')
            Write-Output ('[ERROR] ' + $_.Exception.Message)
        }
    }
