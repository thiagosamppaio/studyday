// Regras do StudyDay: cronograma, revisões espaçadas, flashcards, caderno de erros e desempenho.
import { iso, today, addDays, parse, dayDiff } from './sd-util.js';
import { app, topico, questoesDe, cardsDe, progTopico } from './sd-dados.js';

export const REVISOES = [1, 7, 30]; // dias após o estudo do tópico
const INTERVALOS = [0, 1, 3, 7, 15, 30]; // dias por caixa dos flashcards (Leitner)

export const estudado = tid => !!(app.p.topicos[tid] && app.p.topicos[tid].estudadoEm);
export const horasTopico = t => Math.max(0.5, Number(t.horas) || 1.5);

// ---------- cronograma ----------
/** Dias até a prova (null se não definida). */
export const diasAteProva = () => app.p.cfg.prova ? dayDiff(today(), app.p.cfg.prova) : null;

/**
 * Distribui os tópicos ainda não estudados nos dias de estudo, do hoje até a semana de revisão final.
 * Usa 70% das horas diárias para conteúdo novo; o resto fica para revisões e questões.
 */
export function cronograma() {
  const cfg = app.p.cfg, t0 = today();
  const pend = app.c.topicos.filter(t => !estudado(t.id));
  const capDia = Math.max(20, Math.round((Number(cfg.horasDia) || 2) * 60 * 0.7));
  const dias = (cfg.dias && cfg.dias.length ? cfg.dias : [1, 2, 3, 4, 5]).map(Number);
  const limite = cfg.prova ? addDays(cfg.prova, -(Number(cfg.revisaoFinal) || 0) - 1) : null;
  const out = [];
  let d = t0, i = 0, resto = pend.length ? horasTopico(pend[0]) * 60 : 0, guard = 0;
  while (i < pend.length && guard++ < 800) {
    if (dias.includes(parse(d).getDay())) {
      let cap = capDia; const itens = [];
      while (cap > 0 && i < pend.length) {
        const m = Math.min(cap, resto);
        itens.push({ topico: pend[i], min: Math.round(m), continua: resto > m || itens.some(x => x.topico === pend[i]) });
        cap -= m; resto -= m;
        if (resto <= 0.5) { i++; resto = i < pend.length ? horasTopico(pend[i]) * 60 : 0; }
      }
      out.push({ data: d, itens, depoisDoLimite: !!(limite && d > limite) });
    }
    d = addDays(d, 1);
  }
  const fim = out.length ? out[out.length - 1].data : t0;
  const totalMin = pend.reduce((s, t) => s + horasTopico(t) * 60, 0);
  let horasNecessarias = null;
  if (limite && limite >= t0) {
    let nDias = 0; for (let x = t0; x <= limite; x = addDays(x, 1)) if (dias.includes(parse(x).getDay())) nDias++;
    horasNecessarias = nDias ? totalMin / 0.7 / 60 / nDias : null;
  }
  return { dias: out, fim, atrasado: !!(limite && fim > limite), limite, horasNecessarias, pendentes: pend.length };
}
export const planoDoDia = (d = today()) => (cronograma().dias.find(x => x.data === d) || { itens: [] }).itens;

// ---------- revisões ----------
export function revisoesPendentes(d = today()) {
  const out = [];
  for (const t of app.c.topicos) {
    const p = app.p.topicos[t.id]; if (!p || !p.estudadoEm) continue;
    for (const n of REVISOES) {
      if (p.revisoes && p.revisoes[n]) continue;
      const due = addDays(p.estudadoEm, n);
      if (due <= d) { out.push({ topico: t, n, due, atrasada: due < d }); break; }
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
export function proximaRevisao(tid) {
  const p = app.p.topicos[tid]; if (!p || !p.estudadoEm) return null;
  for (const n of REVISOES) if (!(p.revisoes && p.revisoes[n])) return { n, due: addDays(p.estudadoEm, n) };
  return null;
}
export function marcarRevisao(tid) {
  const r = proximaRevisao(tid); if (!r) return;
  const p = progTopico(tid); p.revisoes = p.revisoes || {}; p.revisoes[r.n] = today();
}
export function marcarEstudado(tid, valor = true) {
  const p = progTopico(tid);
  p.estudadoEm = valor ? today() : ''; if (!valor) p.revisoes = {};
}

// ---------- questões ----------
export const ultima = qid => { const r = app.p.resp[qid]; return r && r.length ? r[r.length - 1] : null; };
export function registrarResposta(qid, ok, modo) {
  (app.p.resp[qid] = app.p.resp[qid] || []).push({ em: Date.now(), ok, modo });
  if (app.p.resp[qid].length > 20) app.p.resp[qid].splice(0, app.p.resp[qid].length - 20);
}
/** Caderno de erros: questões cuja última resposta foi errada. */
export const cadernoErros = () => app.c.questoes.filter(q => { const u = ultima(q.id); return u && !u.ok; });
export function embaralhar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Questões para revisão de um tópico: prioriza as erradas e as nunca feitas. */
export function questoesRevisao(tid, n = 5) {
  const qs = questoesDe(tid);
  const peso = q => { const u = ultima(q.id); return !u ? 1 : u.ok ? 2 : 0; };
  return embaralhar(qs).sort((a, b) => peso(a) - peso(b)).slice(0, n);
}
export function montarSimulado({ areas, n, soEstudados }) {
  let qs = app.c.questoes.filter(q => { const t = topico(q.topico); return t && (!areas || !areas.length || areas.includes(t.area)) && (!soEstudados || estudado(t.id)); });
  qs = embaralhar(qs);
  // equilibra entre áreas: intercala por área
  const porArea = new Map();
  for (const q of qs) { const a = topico(q.topico).area; if (!porArea.has(a)) porArea.set(a, []); porArea.get(a).push(q); }
  const filas = [...porArea.values()], out = [];
  while (out.length < n && filas.some(f => f.length)) for (const f of filas) if (f.length && out.length < n) out.push(f.shift());
  return embaralhar(out);
}

// ---------- flashcards ----------
export function cardsParaHoje(limiteNovos = 20) {
  const d = today(), devidos = [], novos = [];
  for (const c of app.c.cards) {
    if (!estudado(c.topico)) continue;
    const s = app.p.cards[c.id];
    if (!s) novos.push(c); else if (s.prox <= d) devidos.push(c);
  }
  return [...embaralhar(devidos), ...novos.slice(0, limiteNovos)];
}
/** nota: 0 = errei, 1 = acertei, 2 = fácil */
export function avaliarCard(cid, nota) {
  const s = app.p.cards[cid] || { caixa: 0 };
  s.caixa = nota === 0 ? 1 : Math.min(5, (s.caixa || 0) + (nota === 2 ? 2 : 1));
  s.prox = addDays(today(), nota === 0 ? 1 : INTERVALOS[s.caixa]);
  app.p.cards[cid] = s;
}
export const dominioCards = tid => { const cs = cardsDe(tid); if (!cs.length) return null; return cs.filter(c => (app.p.cards[c.id] || {}).caixa >= 3).length / cs.length; };

// ---------- desempenho ----------
/** Acerto (última resposta de cada questão) para um conjunto de questões. */
export function acerto(qs) {
  let feitas = 0, certas = 0;
  for (const q of qs) { const u = ultima(q.id); if (u) { feitas++; if (u.ok) certas++; } }
  return { feitas, certas, total: qs.length, pct: feitas ? Math.round(certas / feitas * 100) : null };
}
export const acertoTopico = tid => acerto(questoesDe(tid));
export const acertoArea = aid => acerto(app.c.questoes.filter(q => { const t = topico(q.topico); return t && t.area === aid; }));
export function respostasNoPeriodo(dias = 7) {
  const desde = Date.now() - dias * 864e5; let n = 0, ok = 0;
  for (const arr of Object.values(app.p.resp)) for (const r of arr) if (r.em >= desde) { n++; if (r.ok) ok++; }
  return { n, ok, pct: n ? Math.round(ok / n * 100) : null };
}
export function sequenciaDias() {
  const comResposta = new Set();
  for (const a of Object.values(app.p.resp)) for (const r of a) comResposta.add(iso(new Date(r.em)));
  const ativo = d => (app.p.estudo[d] || 0) > 0 || comResposta.has(d);
  let d = today(), n = 0;
  if (!ativo(d)) d = addDays(d, -1);
  while (ativo(d) && n < 400) { n++; d = addDays(d, -1); }
  return n;
}
export const progressoGeral = () => { const t = app.c.topicos.length; const e = app.c.topicos.filter(x => estudado(x.id)).length; return { t, e, pct: t ? Math.round(e / t * 100) : 0 }; };
export function pontosFracos(n = 5) {
  return app.c.topicos.map(t => ({ t, a: acertoTopico(t.id) })).filter(x => x.a.feitas >= 3 && x.a.pct < 70).sort((a, b) => a.a.pct - b.a.pct).slice(0, n);
}
