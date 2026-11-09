// Dados do StudyDay: conteúdo (pacotes de estudo) e progresso de quem estuda.
// O conteúdo vem de arquivos "pacote" (JSON). O progresso fica só neste aparelho.
import { today } from './sd-util.js';

export const VERSAO_APP = '1.0';
const KEY = 'studyday.progresso.v1';
const PACOTES_EMBUTIDOS = ['conteudo-1.json'];

export const app = {
  c: { areas: [], topicos: [], questoes: [], cards: [], referencias: [], pacotes: [] }, // conteúdo mesclado
  p: null,                                    // progresso
  st: { tab: 'hoje' },
  render: () => {},
};

export function progressoNovo() {
  return {
    v: 1,
    cfg: { nome: '', prova: '', horasDia: 2, dias: [1, 2, 3, 4, 5], boas: false, revisaoFinal: 7 },
    pacotes: {},     // pacotes importados pelo usuário: id -> pacote
    topicos: {},     // id -> { estudadoEm, revisoes: { '1': data, '7': data, '30': data }, minutos }
    resp: {},        // id da questão -> [{ em, ok, modo }]
    cards: {},       // id do card -> { caixa, prox }
    simulados: [],   // { em, n, acertos, seg, porArea }
    estudo: {},      // 'AAAA-MM-DD' -> minutos
    refs: {},        // id da referência -> { lido }
  };
}
function migrar(p) {
  const n = progressoNovo();
  if (!p || typeof p !== 'object') return n;
  Object.assign(n, p);
  n.cfg = Object.assign(progressoNovo().cfg, p.cfg || {});
  for (const k of ['pacotes', 'topicos', 'resp', 'cards', 'estudo', 'refs']) if (!n[k] || typeof n[k] !== 'object') n[k] = {};
  if (!Array.isArray(n.simulados)) n.simulados = [];
  return n;
}
export function carregarProgresso() {
  try { app.p = migrar(JSON.parse(localStorage.getItem(KEY))); } catch (e) { app.p = progressoNovo(); }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* opcional */ }
}
export function salvar() {
  try { localStorage.setItem(KEY, JSON.stringify(app.p)); return true; }
  catch (e) { return false; }
}
export function substituirProgresso(p) { app.p = migrar(p); salvar(); mesclar(); }

// ---------- conteúdo ----------
let embutidos = [];
export function validarPacote(x) {
  return x && x.formato === 'studyday-pacote' && x.id && Array.isArray(x.topicos);
}
export async function carregarConteudo() {
  embutidos = [];
  for (const arq of PACOTES_EMBUTIDOS) {
    try { const r = await fetch(arq, { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); if (validarPacote(j)) embutidos.push(j); } }
    catch (e) { /* sem internet e sem cache: segue com os importados */ }
  }
  mesclar();
}
/** Junta os pacotes (embutidos + importados). Itens com o mesmo id: vale o pacote carregado por último. */
export function mesclar() {
  const todos = [...embutidos, ...Object.values(app.p.pacotes || {})];
  const mapa = { areas: new Map(), topicos: new Map(), questoes: new Map(), cards: new Map(), referencias: new Map() };
  for (const pk of todos) for (const k of Object.keys(mapa)) for (const it of (pk[k] || [])) if (it && it.id) mapa[k].set(it.id, it);
  const ordArea = new Map([...mapa.areas.values()].map(a => [a.id, a.ordem ?? 99]));
  app.c = {
    areas: [...mapa.areas.values()].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99)),
    topicos: [...mapa.topicos.values()].sort((a, b) => (ordArea.get(a.area) ?? 99) - (ordArea.get(b.area) ?? 99) || (a.ordem ?? 99) - (b.ordem ?? 99)),
    questoes: [...mapa.questoes.values()],
    cards: [...mapa.cards.values()],
    referencias: [...mapa.referencias.values()],
    pacotes: todos.map(p => ({ id: p.id, titulo: p.titulo, data: p.data, embutido: embutidos.includes(p) })),
  };
}
export function importarPacote(pk) {
  app.p.pacotes[pk.id] = pk;
  salvar(); mesclar();
}

// ---------- atalhos ----------
export const area = id => app.c.areas.find(a => a.id === id);
export const topico = id => app.c.topicos.find(t => t.id === id);
export const ref = id => app.c.referencias.find(r => r.id === id);
export const questoesDe = tid => app.c.questoes.filter(q => q.topico === tid);
export const cardsDe = tid => app.c.cards.filter(c => c.topico === tid);
export const progTopico = id => app.p.topicos[id] || (app.p.topicos[id] = { estudadoEm: '', revisoes: {}, minutos: 0 });
export function registrarMinutos(min, tid) {
  if (!(min > 0)) return;
  const d = today();
  app.p.estudo[d] = (app.p.estudo[d] || 0) + min;
  if (tid) progTopico(tid).minutos = (progTopico(tid).minutos || 0) + min;
  salvar();
}
