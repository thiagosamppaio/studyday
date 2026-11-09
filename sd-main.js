// Inicialização, navegação e eventos globais do StudyDay.
import { $, ic } from './sd-util.js';
import { app, carregarProgresso, carregarConteudo, salvar } from './sd-dados.js';
import { acoes, forms, telas, aoMudar, aoDigitar, folhaAberta, fecharFolha, aviso } from './sd-ui.js';
import './tela-hoje.js';
import { iniciarCron } from './tela-plano.js';
import './tela-questoes.js';
import './tela-cards.js';
import { instalacao } from './tela-mais.js';

const NAV = [['hoje', 'sun', 'Hoje'], ['plano', 'map', 'Plano'], ['questoes', 'quiz', 'Questões'], ['cards', 'cards', 'Cards'], ['mais', 'more', 'Mais']];

function render() {
  const tela = telas[app.st.tab] || telas.hoje;
  $('#main').innerHTML = tela.render();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === (tela.aba || app.st.tab)));
  if (tela.depois) tela.depois();
}
app.render = render;
window.__studyday = app; // diagnóstico

acoes.tab = el => { app.st.tab = el.dataset.tab; if (folhaAberta()) fecharFolha(); render(); scrollTo(0, 0); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = acoes[el.dataset.act];
  if (fn) { if (el.tagName === 'BUTTON' && !el.form) e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => { for (const fn of aoMudar) { try { fn(e.target, e); } catch (err) { console.error(err); } } });
document.addEventListener('input', e => { for (const fn of aoDigitar) { try { fn(e.target, e); } catch (err) { console.error(err); } } });
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target, fn = forms[f.dataset.form];
  if (fn) { try { fn(f, e.submitter); } catch (err) { console.error(err); aviso('Algo deu errado. Tente de novo.'); } }
});
addEventListener('popstate', () => { if (folhaAberta()) fecharFolha(true); });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalacao.evento = e; if (app.st.tab === 'mais') render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !folhaAberta() && !$('#quiz').classList.contains('on')) render(); });

async function iniciar() {
  document.querySelector('#nav div').innerHTML = NAV.map(([t, i, n]) => `<button data-act="tab" data-tab="${t}">${ic(i)}<span>${n}</span></button>`).join('');
  carregarProgresso();
  await carregarConteudo();
  document.body.classList.remove('carregando');
  render(); iniciarCron();
  if (!app.p.cfg.boas) setTimeout(() => acoes.config(), 400);
  if (!window.StudyNativa && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
iniciar().catch(err => { console.error(err); document.body.classList.remove('carregando'); $('#main').innerHTML = '<div class="empty"><b>Não foi possível abrir o StudyDay</b>Feche e abra de novo.</div>'; });
export { salvar };
