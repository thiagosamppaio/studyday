// Componentes de interface: registro de ações, folha inferior, avisos e trechos reutilizados.
import { $, esc, ic } from './sd-util.js';
import { app } from './sd-dados.js';

export const acoes = {};      // data-act -> fn(elemento, evento)
export const forms = {};      // data-form -> fn(form, botão)
export const telas = {};      // aba -> { render(), depois?(), aba? }
export const aoMudar = [];
export const aoDigitar = [];

let aberta = false;
export const folhaAberta = () => aberta;
export function abrirFolha(html) {
  $('#sheetBody').innerHTML = html;
  $('#sheetWrap').classList.add('on');
  if (!aberta) history.pushState({ folha: 1 }, '');
  aberta = true;
  $('.sheet').scrollTop = 0;
}
export function fecharFolha(porVoltar) {
  if (!aberta) return;
  aberta = false;
  $('#sheetWrap').classList.remove('on');
  if (!porVoltar) history.back();
}
export const cabecalho = (t, extra = '') => `<div class="sh-t"><h3>${t}</h3>${extra || '<button class="x" data-act="fechar">Fechar</button>'}</div>`;
acoes.fechar = () => fecharFolha();

let tt;
export function aviso(msg) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>`; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200);
}
export const vazio = (titulo, texto) => `<div class="empty"><b>${titulo}</b>${texto}</div>`;
export const barra = (pct, cls = '') => `<div class="prog ${cls}"><i style="width:${Math.max(0, Math.min(100, pct || 0))}%"></i></div>`;
export function saudacao() {
  const h = new Date().getHours();
  return (h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (app.p.cfg.nome ? ', ' + esc(app.p.cfg.nome) : '');
}
export const cabecalhoTela = (sub, titulo, extra = '') => `<div class="hd"><div class="grow"><div class="sub">${sub}</div><h1 class="cap">${titulo}</h1></div>${extra}</div>`;

/** Texto de resumo: linhas "## título", "- item", "**negrito**"; parágrafos separados. */
export function renderResumo(linhas) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  let h = '', lista = false;
  for (const l of (linhas || [])) {
    if (l.startsWith('- ')) { if (!lista) { h += '<ul>'; lista = true; } h += `<li>${inl(l.slice(2))}</li>`; continue; }
    if (lista) { h += '</ul>'; lista = false; }
    if (l.startsWith('## ')) h += `<h4>${inl(l.slice(3))}</h4>`; else h += `<p>${inl(l)}</p>`;
  }
  if (lista) h += '</ul>';
  return `<div class="resumo">${h}</div>`;
}
export const corArea = a => (a && a.cor) || 'var(--acc)';
export { ic };
