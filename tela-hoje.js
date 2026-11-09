// Hoje: o que estudar, revisões vencidas, flashcards, caderno de erros e indicadores rápidos.
import { esc, ic, today, fmtLong, fmtHoras, plural } from './sd-util.js';
import { app } from './sd-dados.js';
import { planoDoDia, revisoesPendentes, cardsParaHoje, cadernoErros, respostasNoPeriodo, sequenciaDias, progressoGeral, diasAteProva, pontosFracos } from './sd-logica.js';
import { acoes, telas, saudacao, cabecalhoTela, barra } from './sd-ui.js';

function render() {
  const dp = diasAteProva(), g = progressoGeral();
  const plano = planoDoDia(), revs = revisoesPendentes(), cards = cardsParaHoje().length, erros = cadernoErros().length;
  const sem = respostasNoPeriodo(7), seq = sequenciaDias();
  const minHoje = app.p.estudo[today()] || 0, meta = Math.round((Number(app.p.cfg.horasDia) || 2) * 60);
  let h = cabecalhoTela(saudacao(), fmtLong(today()));

  h += `<div class="card contagem">${dp !== null ? `<b>${Math.max(0, dp)}</b><span>dia${dp === 1 ? '' : 's'} para a prova</span>` : `<span class="grow">Defina a data da prova para montar o cronograma.</span><button class="btn mini" data-act="config">Definir</button>`}</div>`;

  h += `<div class="tiles">
   <div class="tile"><b>${fmtHoras(minHoje)}</b><span>de ${fmtHoras(meta)} hoje</span></div>
   <div class="tile"><b>${seq}</b><span>dia${seq === 1 ? '' : 's'} seguidos</span></div>
   <div class="tile"><b>${sem.pct === null ? '–' : sem.pct + '%'}</b><span>acertos (7 dias)</span></div>
   <div class="tile"><b>${g.pct}%</b><span>conteúdo estudado</span></div></div>`;

  // plano de hoje
  h += `<section class="painel"><div class="ph"><h2>Estudar hoje</h2><button class="link" data-act="tab" data-tab="plano">Plano</button></div><div class="card bloco">`;
  if (plano.length) h += plano.map(i => `<div class="linha"><div class="grow"><div class="t">${esc(i.topico.nome)}</div><div class="meta">${fmtHoras(i.min)}${i.continua ? ' · parte do tópico' : ''}</div></div><button class="btn mini" data-act="topico" data-id="${i.topico.id}">Abrir</button></div>`).join('');
  else if (!app.p.cfg.dias.includes(new Date().getDay()) && g.e < g.t) h += `<div class="sub">Hoje não é um dia de estudo no seu plano. Que tal uma revisão rápida?</div>`;
  else h += `<div class="sub">${g.t && g.e === g.t ? 'Todo o conteúdo já foi estudado. Foque em revisões e simulados.' : 'Nada novo programado para hoje.'}</div>`;
  h += `</div></section>`;

  // revisões
  if (revs.length) h += `<section class="painel"><div class="ph"><h2>Revisões de hoje</h2></div><div class="card bloco">${revs.map(r => `<div class="linha"><div class="grow"><div class="t">${esc(r.topico.nome)}</div><div class="meta">Revisão de ${r.n} dia${r.n > 1 ? 's' : ''}${r.atrasada ? ' · <span class="late">atrasada</span>' : ''}</div></div><button class="btn mini" data-act="revisarHoje" data-id="${r.topico.id}">Revisar</button></div>`).join('')}</div></section>`;

  // cards e erros
  h += `<div class="btns h" style="margin-top:14px">
   <button class="btn" data-act="${cards ? 'cardsHoje' : 'tab'}" data-tab="cards">${ic('cards')}${cards ? plural(cards, 'card', 'cards') : 'Cards em dia'}</button>
   <button class="btn" data-act="${erros ? 'treinoErros' : 'tab'}" data-tab="questoes">${ic('alert')}${erros ? plural(erros, 'erro', 'erros') + ' a refazer' : 'Sem erros pendentes'}</button></div>
   <div class="btns"><button class="btn pri" data-act="simuladoConfig">${ic('timer')}Fazer um simulado</button></div>`;

  const fracos = pontosFracos(3);
  if (fracos.length) h += `<section class="painel"><div class="ph"><h2>Pontos para reforçar</h2></div><div class="card bloco">${fracos.map(x => `<div class="linha"><div class="grow"><div class="t" style="white-space:normal">${esc(x.t.nome)}</div>${barra(x.a.pct)}<div class="meta">${x.a.pct}% de acertos</div></div><button class="btn mini" data-act="treinoTopico" data-id="${x.t.id}">Treinar</button></div>`).join('')}</div></section>`;
  return h;
}
telas.hoje = { render };
acoes.revisarHoje = el => acoes.revisaoTopico(el.dataset.id);
