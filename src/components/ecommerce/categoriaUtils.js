export function slugCategoria(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\p{Mark}]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function capitalizarCategoria(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
