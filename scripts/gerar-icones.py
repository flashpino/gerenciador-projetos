"""Gera os ícones do PWA em public/. Rodar: python scripts/gerar-icones.py

Precisa do Pillow (pip install pillow). Não entra no package.json: roda só quando
o ícone muda, e o resultado é versionado.
Cores = tokens de src/styles/tokens.css (manifest e PNG não leem variável CSS):
  #0073ea = --color-primary · #ffffff = --color-surface
"""
from pathlib import Path

from PIL import Image, ImageDraw

AZUL = "#0073ea"
BRANCO = "#ffffff"
PUBLIC = Path(__file__).resolve().parent.parent / "public"


def colunas(lado: float, fracao: float) -> list[tuple[float, float, float, float]]:
    """Três colunas de kanban, alturas 100/75/50%, alinhadas no topo, centradas."""
    caixa = lado * fracao
    largura, vao = caixa / 4, caixa / 8
    x0 = y0 = (lado - caixa) / 2
    return [
        (x0 + i * (largura + vao), y0, x0 + i * (largura + vao) + largura, y0 + caixa * alt)
        for i, alt in enumerate((1.0, 0.75, 0.5))
    ]


def png(nome: str, lado: int, fracao: float) -> None:
    img = Image.new("RGB", (lado, lado), AZUL)
    desenho = ImageDraw.Draw(img)
    for x1, y1, x2, y2 in colunas(lado, fracao):
        desenho.rounded_rectangle((x1, y1, x2, y2), radius=(x2 - x1) * 0.2, fill=BRANCO)
    img.save(PUBLIC / nome)


def svg() -> None:
    rects = "".join(
        f'<rect x="{x1:g}" y="{y1:g}" width="{x2 - x1:g}" height="{y2 - y1:g}" rx="{(x2 - x1) * 0.2:g}" fill="{BRANCO}"/>'
        for x1, y1, x2, y2 in colunas(64, 0.625)
    )
    (PUBLIC / "favicon.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect width="64" height="64" rx="14" fill="{AZUL}"/>{rects}</svg>\n',
        encoding="utf-8",
    )


# ponytail: 0.625 do lado para "any"; 0.5 no maskable cabe no círculo de 80%
# (diagonal da caixa = 0.5 * 1.414 = 0.707 < 0.8).
png("pwa-192.png", 192, 0.625)
png("pwa-512.png", 512, 0.625)
png("pwa-maskable-512.png", 512, 0.5)
png("apple-touch-icon.png", 180, 0.625)
svg()
