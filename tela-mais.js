// Mais: desempenho, biblioteca, importação de pacotes, backup do progresso e ajustes.
import { $, esc, ic, today, addDays, iso, fmtHoras, DOW } from './sd-util.js';
import { app, salvar, VERSAO_APP, area, ref, validarPacote, importarPacote, substituirProgresso, progressoNovo } from './sd-dados.js';
import { acertoArea, acertoTopico, progressoGeral, respostasNoPeriodo, pontosFracos, cadernoErros, estudado } from './sd-logica.js';
import { acoes, telas, abrirFolha, fecharFolha, cabecalho, aviso, barra, cabecalhoTela, corArea } from './sd-ui.js';

export const instalacao = { evento: null };

function render() {
  const g = progressoGeral();
  return `${cabecalhoTela('Acompanhamento e ajustes', 'Mais')}
  <div class="sec">
   <button class="item" data-act="desempenho">${ic('chart')}<div class="grow"><div class="t">Desempenho</div><div class="meta">Acertos por área e tópico, horas estudadas, simulados</div></div>${ic('r')}</button>
   <button class="item" data-act="biblioteca">${ic('book')}<div class="grow"><div class="t">Biblioteca</div><div class="meta">${app.c.referencias.length} referências com links · marque o que já leu</div></div>${ic('r')}</button>
   <button class="item" data-act="config">${ic('gear')}<div class="grow"><div class="t">Plano de estudos</div><div class="meta">Data da prova, horas por dia, dias da semana</div></div>${ic('r')}</button>
  </div>
  <h2>Conteúdo</h2><div class="sec">
   <button class="item" data-act="importarPacote">${ic('upload')}<div class="grow"><div class="t">Importar pacote de estudo</div><div class="meta">Adiciona novos tópicos, questões e cards sem apagar nada</div></div></button>
   <div class="item"><div class="grow"><div class="t">Pacotes carregados</div><div class="meta">${app.c.pacotes.map(p => esc(p.titulo || p.id)).join(' · ') || 'nenhum'}</div><div class="meta">${app.c.topicos.length} tópicos · ${app.c.questoes.length} questões · ${app.c.cards.length} flashcards</div></div></div>
  </div>
  <h2>Seu progresso</h2><div class="sec">
   <button class="item" data-act="exportarProgresso">${ic('save')}<div class="grow"><div class="t">Exportar backup do progresso</div><div class="meta">Respostas, revisões, cards e configurações</div></div></button>
   <button class="item" data-act="restaurarProgresso">${ic('rep')}<div class="grow"><div class="t">Restaurar backup</div><div class="meta">Substitui o progresso atual pelo do arquivo</div></div></button>
   <button class="item dan" data-act="zerarProgresso"><div class="grow"><div class="t">Recomeçar do zero</div><div class="meta">Apaga respostas, revisões e estatísticas</div></div></button>
  </div>
  <p class="note">O progresso fica só neste aparelho. Exporte um backup de vez em quando e guarde fora do celular.</p>
  ${instalacao.evento ? `<div class="btns"><button class="btn pri" data-act="instalar">Instalar o StudyDay neste aparelho</button></div>` : ''}
  <p class="note centro">StudyDay · versão ${VERSAO_APP} · ${g.e}/${g.t} tópicos estudados</p>`;
}
telas.mais = { render };

// ---------- desempenho ----------
acoes.desempenho = () => {
  const sem = respostasNoPeriodo(7), mes = respostasNoPeriodo(30), erros = cadernoErros().length;
  const dias = []; for (let i = 13; i >= 0; i--) { const d = addDays(today(), -i); dias.push({ d, m: app.p.estudo[d] || 0 }); }
  const maxM = Math.max(30, ...dias.map(x => x.m));
  const totalMin = Object.values(app.p.estudo).reduce((s, m) => s + m, 0);
  const fracos = pontosFracos(8);
  abrirFolha(cabecalho('Desempenho') + `
  <div class="stats"><div><b>${sem.pct === null ? '–' : sem.pct + '%'}</b><span>acertos em 7 dias (${sem.n})</span></div><div><b>${mes.pct === null ? '–' : mes.pct + '%'}</b><span>acertos em 30 dias (${mes.n})</span></div><div><b>${fmtHoras(totalMin)}</b><span>estudo total</span></div></div>
  <h2>Minutos de estudo (14 dias)</h2>
  <div class="card semana"><div class="barras" style="grid-template-columns:repeat(14,1fr);gap:4px">${dias.map(x => `<div class="bar ${x.d === today() ? 'hoje' : ''}" title="${x.m} min"><i style="height:${Math.round(x.m / maxM * 100)}%;background:var(--acc)"></i><span>${DOW[new Date(x.d + 'T12:00').getDay()][0].toUpperCase()}</span></div>`).join('')}</div></div>
  <h2>Acertos por área</h2><div class="card bloco barras-h">${app.c.areas.map(a => { const x = acertoArea(a.id); return `<div class="bh"><span>${esc(a.nome)} <span class="pct">(${x.feitas}/${x.total})</span></span><b class="pct">${x.pct === null ? '–' : x.pct + '%'}</b>${barra(x.pct || 0, (x.pct || 0) >= 70 ? 'ok' : '')}</div>`; }).join('')}</div>
  ${fracos.length ? `<h2>Tópicos para reforçar (abaixo de 70%)</h2><div class="sec">${fracos.map(f => `<button class="item" data-act="treinoTopico" data-id="${f.t.id}"><div class="grow"><div class="t" style="white-space:normal">${esc(f.t.nome)}</div><div class="meta">${f.a.pct}% em ${f.a.feitas} questões</div></div>${ic('play')}</button>`).join('')}</div>` : ''}
  ${app.p.simulados.length ? `<h2>Simulados</h2><div class="card pad">${app.p.simulados.slice().reverse().slice(0, 10).map(s => `<div class="mini"><span>${new Date(s.em).toLocaleDateString('pt-BR')} · ${s.n} questões</span><b>${Math.round(s.acertos / s.n * 100)}%</b></div>`).join('')}</div>` : ''}
  <p class="note">${erros} questão(ões) no caderno de erros. O percentual considera a última resposta de cada questão.</p>`);
};

// ---------- biblioteca ----------
const TIPOS = { lei: 'Legislação', ms: 'Ministério da Saúde', diretriz: 'Diretrizes e protocolos', oms: 'OMS e IBGE', artigo: 'Artigos', livro: 'Livros' };
acoes.biblioteca = () => {
  const grupos = Object.keys(TIPOS).map(k => [k, app.c.referencias.filter(r => (r.tipo || 'artigo') === k)]).filter(g => g[1].length);
  const lidos = app.c.referencias.filter(r => (app.p.refs[r.id] || {}).lido).length;
  abrirFolha(cabecalho('Biblioteca') + `<p class="note top">${lidos} de ${app.c.referencias.length} marcadas como lidas. Toque no título para abrir.</p>
  ${grupos.map(([k, rs]) => `<h2>${TIPOS[k]}</h2><div class="sec">${rs.map(r => `<div class="item"><label class="tog" title="Lido"><input type="checkbox" data-lido="${r.id}" ${(app.p.refs[r.id] || {}).lido ? 'checked' : ''}><span></span></label>
   <div class="grow"><div class="t" style="white-space:normal">${esc(r.titulo)}</div><div class="meta">${esc([r.autores, r.ano].filter(Boolean).join(', '))}${r.gratuito === false ? ' · obra paga' : ''}</div>
   ${(r.links || []).length ? `<div class="meta">${r.links.map(l => `<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t || 'abrir')}</a>`).join(' · ')}</div>` : ''}${r.nota ? `<div class="meta">${esc(r.nota)}</div>` : ''}</div></div>`).join('')}</div>`).join('')}`);
};
document.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.lido; if (id) { app.p.refs[id] = { lido: e.target.checked }; salvar(); } });

// ---------- importar pacote ----------
acoes.importarPacote = () => { const i = $('#arqPacote'); i.value = ''; i.click(); };
$('#arqPacote').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  let j = null; try { j = JSON.parse(await f.text()); } catch (err) { j = null; }
  if (!validarPacote(j)) return alert('Este arquivo não é um pacote do StudyDay.');
  if (!confirm(`Importar "${j.titulo || j.id}"?\n\n${(j.topicos || []).length} tópicos · ${(j.questoes || []).length} questões · ${(j.cards || []).length} flashcards\n\nSeu progresso será mantido.`)) return;
  importarPacote(j); app.render(); aviso('Pacote importado');
});

// ---------- backup do progresso ----------
acoes.exportarProgresso = () => {
  const json = JSON.stringify(Object.assign({ formato: 'studyday-progresso' }, app.p, { pacotes: app.p.pacotes }));
  const nome = 'studyday-progresso-' + today() + '.json';
  if (window.StudyNativa) { window.StudyNativa.salvarArquivo(nome, json); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); aviso('Backup gerado');
};
acoes.restaurarProgresso = () => { const i = $('#arqProgresso'); i.value = ''; i.click(); };
$('#arqProgresso').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  let j = null; try { j = JSON.parse(await f.text()); } catch (err) { j = null; }
  if (!j || j.formato !== 'studyday-progresso') return alert('Este arquivo não é um backup do StudyDay.');
  if (!confirm('Substituir o progresso atual pelo do arquivo?')) return;
  delete j.formato; substituirProgresso(j); app.render(); aviso('Progresso restaurado');
});
acoes.zerarProgresso = () => {
  if (!confirm('Apagar todo o progresso (respostas, revisões, cards e estatísticas)? O conteúdo e as configurações continuam.')) return;
  const cfg = app.p.cfg, pacotes = app.p.pacotes;
  substituirProgresso(Object.assign(progressoNovo(), { cfg, pacotes })); app.render(); aviso('Progresso apagado');
};
acoes.instalar = () => { if (instalacao.evento) { instalacao.evento.prompt(); instalacao.evento.userChoice.finally(() => { instalacao.evento = null; app.render(); }); } };
export { iso, estudado, acertoTopico, area, ref, corArea };
