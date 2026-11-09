// Questões: treino com correção imediata, revisões, simulados cronometrados e caderno de erros.
import { $, esc, ic, today, fmtShort, fmtHoras, plural } from './sd-util.js';
import { app, salvar, area, topico, questoesDe } from './sd-dados.js';
import { registrarResposta, cadernoErros, questoesRevisao, montarSimulado, marcarRevisao, proximaRevisao, acertoTopico, acertoArea, ultima, embaralhar, estudado } from './sd-logica.js';
import { acoes, forms, telas, abrirFolha, fecharFolha, cabecalho, aviso, vazio, barra, cabecalhoTela, corArea } from './sd-ui.js';

const LETRAS = 'ABCDEFG';
let Q = null; // sessão atual
let relogio = null;

function render() {
  const erros = cadernoErros().length, total = app.c.questoes.length;
  const feitas = app.c.questoes.filter(q => ultima(q.id)).length;
  let h = cabecalhoTela(`${feitas} de ${total} questões já respondidas`, 'Questões');
  h += `<div class="btns"><button class="btn pri" data-act="simuladoConfig">${ic('timer')}Novo simulado</button>
  <div class="btns h" style="margin:0"><button class="btn" data-act="treinoErros" ${erros ? '' : 'disabled'}>${ic('alert')}Caderno de erros (${erros})</button><button class="btn" data-act="treinoAleatorio">${ic('zap')}10 aleatórias</button></div></div>`;
  if (app.p.simulados.length) {
    h += `<h2>Últimos simulados</h2><div class="card pad">${app.p.simulados.slice(-5).reverse().map(s => `<div class="mini"><span>${new Date(s.em).toLocaleDateString('pt-BR')} · ${s.n} questões · ${fmtHoras(Math.round(s.seg / 60))}</span><b>${Math.round(s.acertos / s.n * 100)}%</b></div>`).join('')}</div>`;
  }
  h += `<h2>Treinar por tópico</h2>`;
  for (const a of app.c.areas) {
    const ts = app.c.topicos.filter(t => t.area === a.id && questoesDe(t.id).length); if (!ts.length) continue;
    const ac = acertoArea(a.id);
    h += `<div class="area-h"><i class="sw" style="--c:${corArea(a)}"></i><h2>${esc(a.nome)}</h2><span class="pct">${ac.pct !== null ? ac.pct + '%' : ''}</span></div>
    <div class="sec">${ts.map(t => { const x = acertoTopico(t.id); return `<button class="item" data-act="treinoTopico" data-id="${t.id}"><div class="grow"><div class="t" style="white-space:normal">${esc(t.nome)}</div><div class="meta">${x.feitas}/${x.total} feitas${x.pct !== null ? ' · ' + x.pct + '% de acertos' : ''}</div>${x.feitas ? barra(x.pct, x.pct >= 70 ? 'ok' : '') : ''}</div>${ic('play')}</button>`; }).join('')}</div>`;
  }
  if (!total) h += vazio('Nenhuma questão ainda', 'As questões chegam com os pacotes de estudo.');
  return h;
}
telas.questoes = { render };

// ---------- iniciar sessões ----------
function iniciar(sessao) {
  if (!sessao.qs.length) return aviso('Não há questões para isso ainda');
  Q = Object.assign({ i: 0, resp: {}, vistas: {}, inicio: Date.now(), fim: false }, sessao);
  // se uma folha estiver aberta, o quiz reaproveita a entrada dela no histórico (evita corrida com history.back)
  if (sheetOpenGuard()) { fecharFolha(true); history.replaceState({ quiz: 1 }, ''); } else history.pushState({ quiz: 1 }, '');
  $('#quiz').classList.add('on'); document.body.style.overflow = 'hidden';
  if (Q.limiteSeg) { clearInterval(relogio); relogio = setInterval(tickRelogio, 1000); }
  desenhar();
}
const sheetOpenGuard = () => document.getElementById('sheetWrap').classList.contains('on');
acoes.treinoTopico = el => { const t = topico(el.dataset.id); iniciar({ modo: 'treino', titulo: t.nome, qs: embaralhar(questoesDe(t.id)) }); };
acoes.treinoErros = () => iniciar({ modo: 'treino', titulo: 'Caderno de erros', qs: embaralhar(cadernoErros()) });
acoes.treinoAleatorio = () => iniciar({ modo: 'treino', titulo: '10 questões aleatórias', qs: embaralhar(app.c.questoes).slice(0, 10) });
acoes.revisaoTopico = tid => { const t = topico(tid); const r = proximaRevisao(tid); iniciar({ modo: 'revisao', tid, titulo: `Revisão de ${r ? r.n : ''} dia${r && r.n > 1 ? 's' : ''} · ${t.nome}`, qs: questoesRevisao(tid, 5) }); };

acoes.simuladoConfig = () => {
  const areasCom = app.c.areas.filter(a => app.c.questoes.some(q => { const t = topico(q.topico); return t && t.area === a.id; }));
  abrirFolha(cabecalho('Novo simulado') + `<form data-form="simulado">
  <h2>Áreas</h2><div class="card pad">${areasCom.map(a => `<label class="chkl"><input type="checkbox" name="areas" value="${a.id}" checked><span class="grow">${esc(a.nome)}</span></label>`).join('')}</div>
  <div class="f g2" style="margin-top:14px"><div><label class="l">Quantidade</label><select class="in" name="n">${[10, 20, 30, 50, 100].map(n => `<option ${n === 20 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div><label class="l">Tempo por questão</label><select class="in" name="tempo"><option value="0">Sem limite</option><option value="90">1,5 min</option><option value="120">2 min</option><option value="180" selected>3 min</option></select></div></div>
  <label class="chkl"><input type="checkbox" name="soEstudados"><span class="grow">Só tópicos já estudados</span></label>
  <p class="hint">No simulado, as respostas só são corrigidas no final, como na prova.</p>
  <div class="btns"><button class="btn pri" type="submit">Começar</button></div></form>`);
};
forms.simulado = f => {
  const fd = new FormData(f), areas = fd.getAll('areas'), n = Number(fd.get('n')), tempo = Number(fd.get('tempo'));
  if (!areas.length) return aviso('Escolha pelo menos uma área');
  const qs = montarSimulado({ areas, n, soEstudados: !!fd.get('soEstudados') });
  if (!qs.length) return aviso('Nenhuma questão com esses critérios');
  iniciar({ modo: 'simulado', titulo: 'Simulado', qs, limiteSeg: tempo ? tempo * qs.length : 0 });
};

// ---------- desenhar ----------
const fmtSeg = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function tickRelogio() {
  if (!Q || Q.fim || !Q.limiteSeg) return clearInterval(relogio);
  const resta = Q.limiteSeg - (Date.now() - Q.inicio) / 1000;
  const el = document.querySelector('.qz-relogio'); if (el) { el.textContent = fmtSeg(resta); el.classList.toggle('pouco', resta < 300); }
  if (resta <= 0) { aviso('Tempo esgotado'); finalizar(); }
}
function desenhar() {
  const box = $('#quiz');
  if (Q.fim && Q.revisando == null) return desenharResultado();
  const i = Q.revisando ?? Q.i, q = Q.qs[i], t = topico(q.topico), a = t && area(t.area);
  const escolhida = Q.resp[q.id];
  const mostrar = Q.fim || (Q.modo !== 'simulado' && escolhida != null);
  const alts = q.alternativas.map((txt, k) => {
    let cls = '';
    if (mostrar) { if (k === q.correta) cls = 'certa'; else if (k === escolhida) cls = 'errada'; }
    else if (k === escolhida) cls = 'sel';
    return `<button class="alt ${cls}" data-act="qzResp" data-k="${k}" ${mostrar ? 'disabled' : ''}><b>${LETRAS[k]}</b><span>${esc(txt)}</span></button>`;
  }).join('');
  const acertou = escolhida === q.correta;
  box.innerHTML = `<div class="qz">
   <div class="qz-top"><button class="iconbtn sm" data-act="qzSair" aria-label="Sair">${ic('x')}</button><div class="grow"><b>${esc(Q.titulo)}</b><br>Questão ${i + 1} de ${Q.qs.length}</div>${Q.limiteSeg && !Q.fim ? `<span class="qz-relogio">${fmtSeg(Q.limiteSeg - (Date.now() - Q.inicio) / 1000)}</span>` : ''}</div>
   ${barra((i + 1) / Q.qs.length * 100)}
   <div class="qz-tag">${esc(a ? a.nome : '')} › ${esc(t ? t.nome : '')}</div>
   <div class="qz-enun">${esc(q.enunciado)}</div>
   ${alts}
   ${mostrar ? `<div class="coment">${escolhida == null ? '<b class="no">Não respondida.</b> ' : acertou ? '<b class="ok">Você acertou.</b> ' : `<b class="no">Resposta correta: ${LETRAS[q.correta]}.</b> `}${esc(q.comentario || '')}${q.fonte ? `<div class="fonte">Fonte: ${esc(q.fonte)}</div>` : ''}</div>` : ''}
   ${Q.modo === 'simulado' && !Q.fim ? `<div class="grade-q">${Q.qs.map((x, k) => `<button class="${Q.resp[x.id] != null ? 'resp' : ''} ${k === i ? 'atual' : ''}" data-act="qzIr" data-k="${k}">${k + 1}</button>`).join('')}</div>` : ''}
  </div>
  <div class="qz-bar"><div>${barraBotoes(i, mostrar)}</div></div>`;
  box.scrollTop = 0;
}
function barraBotoes(i, mostrar) {
  if (Q.revisando != null) return `<button class="btn" data-act="qzRevNav" data-d="-1" ${i ? '' : 'disabled'}>Anterior</button><button class="btn" data-act="qzVoltarResultado">Resultado</button><button class="btn" data-act="qzRevNav" data-d="1" ${i < Q.qs.length - 1 ? '' : 'disabled'}>Próxima</button>`;
  if (Q.modo === 'simulado') {
    const ult = i === Q.qs.length - 1;
    return `<button class="btn" data-act="qzNav" data-d="-1" ${i ? '' : 'disabled'}>Anterior</button>${ult ? '<button class="btn pri" data-act="qzFinalizar">Finalizar</button>' : '<button class="btn pri" data-act="qzNav" data-d="1">Próxima</button>'}`;
  }
  if (!mostrar) return `<button class="btn" data-act="qzPular">Pular</button><button class="btn" disabled>Escolha uma alternativa</button>`;
  return i < Q.qs.length - 1 ? `<button class="btn pri" data-act="qzNav" data-d="1">Próxima</button>` : `<button class="btn pri" data-act="qzFinalizar">Ver resultado</button>`;
}

// ---------- interações ----------
acoes.qzResp = el => {
  const q = Q.qs[Q.i], k = Number(el.dataset.k);
  if (Q.modo === 'simulado') { Q.resp[q.id] = k; return desenhar(); }
  if (Q.resp[q.id] != null) return;
  Q.resp[q.id] = k; registrarResposta(q.id, k === q.correta, Q.modo); salvar(); desenhar();
};
acoes.qzNav = el => { Q.i = Math.max(0, Math.min(Q.qs.length - 1, Q.i + Number(el.dataset.d))); desenhar(); };
acoes.qzIr = el => { Q.i = Number(el.dataset.k); desenhar(); };
acoes.qzPular = () => { if (Q.i < Q.qs.length - 1) { Q.i++; desenhar(); } else finalizar(); };
acoes.qzFinalizar = () => {
  if (Q.modo === 'simulado') { const falta = Q.qs.filter(q => Q.resp[q.id] == null).length; if (falta && !confirm(`Há ${plural(falta, 'questão', 'questões')} sem resposta. Finalizar mesmo assim?`)) return; }
  finalizar();
};
acoes.qzRevisar = el => { Q.revisando = Number(el.dataset.k); desenhar(); };
acoes.qzRevNav = el => { Q.revisando = Math.max(0, Math.min(Q.qs.length - 1, Q.revisando + Number(el.dataset.d))); desenhar(); };
acoes.qzVoltarResultado = () => { Q.revisando = null; desenhar(); };
acoes.qzSair = () => {
  if (Q && !Q.fim && Q.modo === 'simulado' && !confirm('Sair do simulado? As respostas deste simulado não serão salvas.')) return;
  history.back();
};
addEventListener('popstate', () => { if (Q && $('#quiz').classList.contains('on')) fechar(); });
function fechar() { clearInterval(relogio); $('#quiz').classList.remove('on'); $('#quiz').innerHTML = ''; document.body.style.overflow = ''; Q = null; app.render(); }

function finalizar() {
  if (Q.fim) return;
  Q.fim = true; Q.revisando = null; clearInterval(relogio);
  const seg = Math.round((Date.now() - Q.inicio) / 1000);
  if (Q.modo === 'simulado') {
    const porArea = {};
    for (const q of Q.qs) {
      const r = Q.resp[q.id], ok = r === q.correta, aid = (topico(q.topico) || {}).area;
      porArea[aid] = porArea[aid] || { n: 0, ok: 0 }; porArea[aid].n++; if (ok) porArea[aid].ok++;
      if (r != null) registrarResposta(q.id, ok, 'simulado');
    }
    app.p.simulados.push({ em: Date.now(), n: Q.qs.length, acertos: Q.qs.filter(q => Q.resp[q.id] === q.correta).length, seg, porArea });
    if (app.p.simulados.length > 100) app.p.simulados.shift();
  }
  if (Q.modo === 'revisao' && Q.tid) marcarRevisao(Q.tid);
  app.p.estudo[today()] = (app.p.estudo[today()] || 0) + Math.max(1, Math.round(seg / 60));
  salvar();
  desenhar();
}
function desenharResultado() {
  const n = Q.qs.length, ok = Q.qs.filter(q => Q.resp[q.id] === q.correta).length, pct = n ? Math.round(ok / n * 100) : 0;
  const seg = Math.round((Date.now() - Q.inicio) / 1000);
  const porArea = {};
  for (const q of Q.qs) { const aid = (topico(q.topico) || {}).area; porArea[aid] = porArea[aid] || { n: 0, ok: 0 }; porArea[aid].n++; if (Q.resp[q.id] === q.correta) porArea[aid].ok++; }
  $('#quiz').innerHTML = `<div class="qz">
  <div class="qz-top"><button class="iconbtn sm" data-act="qzSair" aria-label="Fechar">${ic('x')}</button><div class="grow"><b>${esc(Q.titulo)}</b></div></div>
  <div class="card placar"><b>${pct}%</b><div class="sub">${ok} de ${n} corretas${Q.modo === 'simulado' ? ' · ' + fmtHoras(Math.round(seg / 60)) : ''}</div></div>
  ${Q.modo === 'revisao' ? '<div class="banner">' + ic('check') + '<span>Revisão registrada. A próxima foi agendada automaticamente.</span></div>' : ''}
  ${Object.keys(porArea).length > 1 ? `<h2>Por área</h2><div class="card bloco barras-h">${Object.entries(porArea).map(([aid, v]) => { const a = area(aid); const p = Math.round(v.ok / v.n * 100); return `<div class="bh"><span>${esc(a ? a.nome : aid)}</span><b class="pct">${p}%</b>${barra(p, p >= 70 ? 'ok' : '')}</div>`; }).join('')}</div>` : ''}
  <h2>Toque para rever cada questão</h2>
  <div class="grade-q">${Q.qs.map((q, k) => `<button class="${Q.resp[q.id] === q.correta ? 'ok' : 'no'}" data-act="qzRevisar" data-k="${k}">${k + 1}</button>`).join('')}</div>
  <p class="note">Questões erradas foram para o <b>caderno de erros</b>.</p>
  </div>
  <div class="qz-bar"><div><button class="btn pri" data-act="qzSair">Concluir</button></div></div>`;
  $('#quiz').scrollTop = 0;
}
