// Plano de estudos: áreas, tópicos, cronograma, detalhe do tópico, cronômetro e configurações.
import { $, esc, ic, today, addDays, fmtShort, fmtRel, fmtHoras, DOW } from './sd-util.js';
import { app, salvar, area, topico, ref, questoesDe, cardsDe, progTopico, registrarMinutos } from './sd-dados.js';
import { estudado, cronograma, proximaRevisao, marcarEstudado, marcarRevisao, acertoTopico, acertoArea, progressoGeral, diasAteProva, horasTopico, REVISOES } from './sd-logica.js';
import { acoes, forms, telas, abrirFolha, fecharFolha, cabecalho, aviso, vazio, barra, cabecalhoTela, renderResumo, corArea } from './sd-ui.js';

export function seloTopico(t) {
  if (!estudado(t.id)) return '<span class="selo">a estudar</span>';
  const r = proximaRevisao(t.id);
  if (!r) return '<span class="selo ok">revisões completas</span>';
  if (r.due <= today()) return '<span class="selo rev">revisar</span>';
  return `<span class="selo ok">estudado · rev. ${fmtRel(r.due).toLowerCase()}</span>`;
}

function render() {
  const g = progressoGeral(), crono = cronograma(), dp = diasAteProva();
  let h = cabecalhoTela(`${g.e} de ${g.t} tópicos estudados`, 'Plano de estudos', `<button class="iconbtn" data-act="config" aria-label="Configurar">${ic('gear')}</button>`);
  h += `<div class="card bloco">${barra(g.pct)}<div class="sub" style="margin-top:8px">${g.pct}% do conteúdo estudado${dp !== null ? ` · ${dp >= 0 ? dp + ' dias para a prova' : 'prova já passou'}` : ''}</div></div>`;
  if (!app.p.cfg.prova) h += `<button class="banner" data-act="config">${ic('cal')}<span>Defina a <b>data da prova</b> e as <b>horas por dia</b> para o app montar seu cronograma.</span></button>`;
  else if (crono.atrasado && crono.horasNecessarias) h += `<div class="banner">${ic('alert')}<span>No ritmo atual, o conteúdo termina em ${fmtShort(crono.fim)}, depois da semana de revisão final. Seriam necessárias cerca de <b>${crono.horasNecessarias.toFixed(1).replace('.', ',')} h por dia</b>.</span></div>`;

  // próximos dias
  const prox = crono.dias.slice(0, 7);
  if (prox.length) {
    h += `<section class="painel"><div class="ph"><h2>Próximos dias de estudo</h2>${crono.dias.length > 7 ? '<button class="link" data-act="cronoCompleto">Ver tudo</button>' : ''}</div><div class="card bloco">${prox.map(diaHtml).join('')}</div></section>`;
  } else if (app.c.topicos.length) h += `<div class="card bloco"><b>Todo o conteúdo já foi estudado.</b><div class="sub">Agora é revisar, fazer simulados e reforçar os pontos fracos.</div></div>`;

  // áreas e tópicos
  for (const a of app.c.areas) {
    const ts = app.c.topicos.filter(t => t.area === a.id); if (!ts.length) continue;
    const est = ts.filter(t => estudado(t.id)).length, ac = acertoArea(a.id);
    h += `<div class="area-h"><i class="sw" style="--c:${corArea(a)}"></i><h2>${esc(a.nome)}</h2><span class="pct">${est}/${ts.length}${ac.pct !== null ? ' · ' + ac.pct + '% acertos' : ''}</span></div>
    <div class="sec">${ts.map(t => { const ac = acertoTopico(t.id); return `<button class="item" data-act="topico" data-id="${t.id}"><div class="grow"><div class="t" style="white-space:normal">${esc(t.nome)}</div><div class="meta">${seloTopico(t)}<span>${questoesDe(t.id).length} questões${ac.pct !== null ? ' · ' + ac.pct + '%' : ''}</span></div></div>${ic('r')}</button>`; }).join('')}</div>`;
  }
  if (!app.c.topicos.length) h += vazio('Nenhum conteúdo carregado', 'Importe um pacote de estudo em Mais › Importar pacote.');
  return h;
}
function diaHtml(d) {
  const p = new Date(d.data + 'T12:00');
  return `<div class="dia-plano"><b class="cap">${d.data === today() ? 'Hoje' : fmtShort(d.data)}</b>${d.depoisDoLimite ? ' <span class="selo rev">após o limite</span>' : ''}<div>${d.itens.map(i => `${esc(i.topico.nome)} <span class="pct">(${fmtHoras(i.min)}${i.continua ? ', parte' : ''})</span>`).join('<br>')}</div></div>`;
}
telas.plano = { render };
acoes.cronoCompleto = () => {
  const c = cronograma();
  abrirFolha(cabecalho('Cronograma completo') + `<p class="note top">${c.pendentes} tópicos a estudar · término previsto: ${fmtShort(c.fim)}${c.limite ? ` · revisão final a partir de ${fmtShort(addDays(c.limite, 1))}` : ''}</p><div class="card bloco">${c.dias.map(diaHtml).join('')}</div>`);
};

// ---------- detalhe do tópico ----------
export function detalheTopico(id) {
  const t = topico(id); if (!t) return;
  const a = area(t.area), p = app.p.topicos[id] || {}, ac = acertoTopico(id), nq = questoesDe(id).length, nc = cardsDe(id).length;
  const refs = (t.refs || []).map(ref).filter(Boolean);
  const r = proximaRevisao(id);
  abrirFolha(cabecalho(esc(t.nome)) + `
  <p class="note top"><i class="sw" style="--c:${corArea(a)}"></i> ${esc(a ? a.nome : '')} · estudo estimado: ${fmtHoras(horasTopico(t) * 60)}</p>
  <div class="stats"><div><b>${nq}</b><span>questões</span></div><div><b>${ac.pct === null ? '–' : ac.pct + '%'}</b><span>acertos</span></div><div><b>${p.minutos ? fmtHoras(p.minutos) : '0'}</b><span>estudado</span></div></div>
  <div class="btns">
   <button class="btn pri" data-act="estudarIniciar" data-id="${id}">${ic('timer')}Iniciar estudo (cronômetro)</button>
   <div class="btns h" style="margin:0">${nq ? `<button class="btn" data-act="treinoTopico" data-id="${id}">${ic('quiz')}Questões</button>` : ''}${nc ? `<button class="btn" data-act="cardsTopico" data-id="${id}">${ic('cards')}Flashcards (${nc})</button>` : ''}</div>
  </div>
  <h2>Situação</h2><div class="card bloco">
   ${estudado(id) ? `<div>Estudado em <b>${fmtShort(p.estudadoEm)}</b>.</div><div class="sub" style="margin-top:4px">Revisões: ${REVISOES.map(n => `${n} dia${n > 1 ? 's' : ''} ${p.revisoes && p.revisoes[n] ? '✓' : (r && r.n === n ? `(${fmtRel(r.due).toLowerCase()})` : '·')}`).join(' · ')}</div>
   ${r && r.due <= today() ? `<div class="btns"><button class="btn pri" data-act="revisar" data-id="${id}">Fazer a revisão de ${r.n} dia${r.n > 1 ? 's' : ''}</button></div>` : ''}
   <div class="btns"><button class="btn mini" data-act="desmarcarEstudado" data-id="${id}">Desmarcar como estudado</button></div>`
    : `<div>Ainda não estudado.</div><div class="btns"><button class="btn" data-act="marcarEstudado" data-id="${id}">${ic('check')}Marcar como estudado</button></div><p class="hint">Ao marcar, o app agenda revisões para 1, 7 e 30 dias depois e libera os flashcards do tópico.</p>`}
  </div>
  <h2>Resumo</h2><div class="card bloco">${renderResumo(t.resumo)}</div>
  ${refs.length ? `<h2>Leituras deste tópico</h2><div class="sec">${refs.map(r => `<a class="item" href="${esc((r.links && r.links[0] && r.links[0].u) || '#')}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${ic('book')}<div class="grow"><div class="t" style="white-space:normal">${esc(r.titulo)}</div><div class="meta">${esc([r.autores, r.ano].filter(Boolean).join(', '))}${r.gratuito === false ? ' · obra paga' : ''}</div></div>${ic('ext')}</a>`).join('')}</div>` : ''}`);
}
acoes.topico = el => detalheTopico(el.dataset.id);
acoes.marcarEstudado = el => { marcarEstudado(el.dataset.id, true); salvar(); app.render(); detalheTopico(el.dataset.id); aviso('Revisões agendadas: 1, 7 e 30 dias'); };
acoes.desmarcarEstudado = el => { if (!confirm('Desmarcar este tópico? As revisões agendadas serão apagadas.')) return; marcarEstudado(el.dataset.id, false); salvar(); app.render(); detalheTopico(el.dataset.id); };
acoes.revisar = el => acoes.revisaoTopico(el.dataset.id);

// ---------- cronômetro de estudo ----------
const CKEY = 'studyday.cronometro';
let cronInt = null;
const lerCron = () => { try { return JSON.parse(localStorage.getItem(CKEY)); } catch (e) { return null; } };
function mostrarCron() {
  const c = lerCron(), el = $('#cron');
  clearInterval(cronInt);
  if (!c) { el.classList.remove('on'); return; }
  const t = topico(c.tid);
  const tick = () => { const s = Math.floor((Date.now() - c.inicio) / 1000); el.querySelector('b').textContent = `${String(Math.floor(s / 3600)).padStart(1, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  el.innerHTML = `${ic('timer')}<b>0:00:00</b><span>${esc(t ? t.nome : 'Estudo livre')}</span><button data-act="estudarEncerrar">Encerrar</button>`;
  el.classList.add('on'); tick(); cronInt = setInterval(tick, 1000);
}
export const iniciarCron = mostrarCron;
acoes.estudarIniciar = el => {
  const c = lerCron();
  if (c && !confirm('Já há um estudo em andamento. Encerrar o anterior e começar este?')) return;
  if (c) encerrar(false);
  localStorage.setItem(CKEY, JSON.stringify({ tid: el.dataset.id || '', inicio: Date.now() }));
  fecharFolha(); mostrarCron(); aviso('Cronômetro iniciado. Bons estudos!');
};
function encerrar(perguntar = true) {
  const c = lerCron(); if (!c) return;
  const min = Math.round((Date.now() - c.inicio) / 60000);
  localStorage.removeItem(CKEY); mostrarCron();
  registrarMinutos(min, c.tid);
  app.render();
  if (!perguntar) return;
  const t = topico(c.tid);
  if (t && !estudado(t.id)) {
    abrirFolha(cabecalho('Estudo encerrado') + `<p class="note top big">Você estudou <b>${fmtHoras(min)}</b> de <b>${esc(t.nome)}</b>.</p>
    <div class="btns"><button class="btn pri" data-act="marcarEstudado" data-id="${t.id}">${ic('check')}Concluí este tópico</button><button class="btn" data-act="fechar">Ainda vou continuar outro dia</button></div>`);
  } else aviso(`Registrado: ${fmtHoras(min)} de estudo`);
}
acoes.estudarEncerrar = () => encerrar(true);

// ---------- configurações do plano ----------
acoes.config = () => {
  const c = app.p.cfg;
  abrirFolha(cabecalho('Configurar plano') + `<form data-form="config">
  <div class="f"><label class="l">Seu nome</label><input class="in" name="nome" value="${esc(c.nome)}" maxlength="30" placeholder="Opcional"></div>
  <div class="f"><label class="l">Data da prova</label><input class="in" type="date" name="prova" value="${c.prova}"></div>
  <div class="f"><label class="l">Horas de estudo por dia</label><input class="in" type="number" name="horasDia" min="0.5" max="12" step="0.5" value="${c.horasDia}"></div>
  <div class="f"><label class="l">Dias da semana em que estuda</label><div class="diasem">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="dias" value="${d}" ${c.dias.includes(d) ? 'checked' : ''}><span>${DOW[d]}</span></label>`).join('')}</div></div>
  <div class="f"><label class="l">Dias reservados para a revisão final (antes da prova)</label><input class="in" type="number" name="revisaoFinal" min="0" max="30" value="${c.revisaoFinal}"></div>
  <p class="hint">O app usa cerca de 70% do tempo diário para conteúdo novo e o restante para revisões, questões e flashcards.</p>
  <div class="btns"><button class="btn pri" type="submit">Salvar</button></div></form>`);
};
forms.config = f => {
  const fd = new FormData(f);
  const dias = fd.getAll('dias').map(Number);
  if (!dias.length) return aviso('Escolha pelo menos um dia da semana');
  Object.assign(app.p.cfg, { nome: (fd.get('nome') || '').toString().trim(), prova: fd.get('prova') || '', horasDia: Math.max(0.5, Number(fd.get('horasDia')) || 2), dias, revisaoFinal: Math.max(0, Number(fd.get('revisaoFinal')) || 0), boas: true });
  salvar(); fecharFolha(); app.render(); aviso('Plano atualizado');
};
