# Gera os arquivos de favicon a partir da marca "VR" que a Navbar desenha
# (span com bg-brand + texto VR). Nao cria arte nova: apenas exporta a mesma
# marca para os formatos que o navegador consome na aba.
#
# Saidas em public/: favicon.svg (vetor, letras em path) e favicon.ico
# (16/32/48, fallback para navegador sem suporte a SVG na aba).
#
# Uso:  powershell -ExecutionPolicy Bypass -File .\gerar-favicon.ps1

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$raiz     = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino  = Join-Path $raiz 'public'

# Tokens do sistema de design (frontend/src/index.css)
$laranja = [System.Drawing.ColorTranslator]::FromHtml('#ff8101')  # --color-brand
$tinta   = [System.Drawing.ColorTranslator]::FromHtml('#16130f')  # --color-on-brand

$lado  = 32.0   # a marca e desenhada num quadrado de 32 unidades
$raioC = 7.0    # cantos arredondados, como o rounded-lg do selo
$escala = 10.0  # desenha a fonte grande e reduz: mais precisao no path

# --------------------------------------------------------------------------
# Contorno das letras "VR" como vetor
# --------------------------------------------------------------------------
$familia = 'Segoe UI'
if (-not (New-Object System.Drawing.FontFamily($familia) -ErrorAction SilentlyContinue)) { $familia = 'Arial' }

$caminhoTexto = New-Object System.Drawing.Drawing2D.GraphicsPath
$formato = [System.Drawing.StringFormat]::GenericTypographic
$caminhoTexto.AddString(
    'VR',
    (New-Object System.Drawing.FontFamily($familia)),
    [int][System.Drawing.FontStyle]::Bold,
    (15.0 * $escala),
    (New-Object System.Drawing.PointF(0, 0)),
    $formato)

# Aproxima as curvas por segmentos de reta: o path fica maior, mas renderiza
# igual em qualquer navegador, sem depender de fonte instalada.
$caminhoTexto.Flatten($null, 0.05)

# Centraliza pelas dimensoes reais do desenho (nao pela metrica da fonte)
$limites = $caminhoTexto.GetBounds()
$deslocX = ($lado * $escala - $limites.Width) / 2 - $limites.X
$deslocY = ($lado * $escala - $limites.Height) / 2 - $limites.Y
$mover = New-Object System.Drawing.Drawing2D.Matrix
$mover.Translate($deslocX, $deslocY)
$caminhoTexto.Transform($mover)

# --------------------------------------------------------------------------
# SVG
# --------------------------------------------------------------------------
$pontos = $caminhoTexto.PathPoints
$tipos  = $caminhoTexto.PathTypes
$d = New-Object System.Text.StringBuilder

for ($i = 0; $i -lt $pontos.Length; $i++) {
    $x = [math]::Round($pontos[$i].X / $escala, 2)
    $y = [math]::Round($pontos[$i].Y / $escala, 2)
    $tipo = $tipos[$i] -band 0x07

    if ($tipo -eq 0) { [void]$d.Append("M$x $y") } else { [void]$d.Append("L$x $y") }
    if (($tipos[$i] -band 0x80) -ne 0) { [void]$d.Append('Z') }
}

$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>VidaReal</title>
  <rect width="32" height="32" rx="$raioC" fill="#ff8101"/>
  <path fill="#16130f" d="$($d.ToString())"/>
</svg>
"@

# UTF-8 sem BOM: o BOM e legal em XML, mas alguns parsers tropecam nele e
# o arquivo aqui e ASCII puro de qualquer forma.
$semBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $destino 'favicon.svg'), $svg, $semBom)
Write-Host "  [ok] favicon.svg"

# --------------------------------------------------------------------------
# PNGs e ICO
# --------------------------------------------------------------------------
function Desenhar([int]$tamanho) {
    $bmp = New-Object System.Drawing.Bitmap($tamanho, $tamanho,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $f = $tamanho / $lado          # 32 unidades -> pixels
    $r = $raioC * $f
    $quadrado = New-Object System.Drawing.Drawing2D.GraphicsPath
    $quadrado.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
    $quadrado.AddArc($tamanho - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
    $quadrado.AddArc($tamanho - 2 * $r, $tamanho - 2 * $r, 2 * $r, 2 * $r, 0, 90)
    $quadrado.AddArc(0, $tamanho - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $quadrado.CloseFigure()

    $g.FillPath((New-Object System.Drawing.SolidBrush($laranja)), $quadrado)

    # A mesma geometria do SVG, reduzida da escala de desenho para pixels
    $letras = $caminhoTexto.Clone()
    $m = New-Object System.Drawing.Drawing2D.Matrix
    $m.Scale($f / $escala, $f / $escala)
    $letras.Transform($m)
    $g.FillPath((New-Object System.Drawing.SolidBrush($tinta)), $letras)

    $g.Dispose()
    return $bmp
}

# Preview grande, so para conferir o desenho a olho
$previa = Desenhar 256
$previa.Save((Join-Path $raiz 'favicon-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$previa.Dispose()
Write-Host "  [ok] favicon-preview.png (conferencia visual, fora de public/)"

# ICO com PNG embutido em cada tamanho (suportado por todo navegador atual)
$tamanhos = @(16, 32, 48)
$imagens = @()
foreach ($t in $tamanhos) {
    $bmp = Desenhar $t
    $mem = New-Object System.IO.MemoryStream
    $bmp.Save($mem, [System.Drawing.Imaging.ImageFormat]::Png)
    $imagens += , @{ tamanho = $t; bytes = $mem.ToArray() }
    $mem.Dispose(); $bmp.Dispose()
}

$ico = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter($ico)
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$imagens.Count)  # ICONDIR

$deslocamento = 6 + 16 * $imagens.Count
foreach ($img in $imagens) {
    $w.Write([byte]$img.tamanho); $w.Write([byte]$img.tamanho)
    $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32)
    $w.Write([uint32]$img.bytes.Length)
    $w.Write([uint32]$deslocamento)
    $deslocamento += $img.bytes.Length
}
foreach ($img in $imagens) { $w.Write($img.bytes) }
$w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $destino 'favicon.ico'), $ico.ToArray())
$w.Dispose(); $ico.Dispose()
Write-Host "  [ok] favicon.ico (16, 32, 48)"

$caminhoTexto.Dispose()
