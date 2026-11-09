// Flashcards com repetição espaçada (caixas de Leitner): errou volta amanhã; acertou, o intervalo cresce.
import { $, esc, ic, plural } from './sd-util.js';
import { app, salvar, area, topico, cardsDe } from './sd-dados.js';
import { cardsParaHoje, avaliarCard, dominioCards, estudado, embaralhar } from './sd-logica.js';
import { acoes, telas, fecharFolha, aviso, vazio, barra, cabecalhoTela, corArea } from './sd-ui.js';

let S = null;

function render() {
  const hoje = cardsParaHoje(), total = app.c.cards.length;
  let h = cabecalhoTela(`${total} flashcards no conteúdo`, 'Flashcards');
  h += hoje.length
    ? `<div class="card bloco"><b>${plural(hoje.length, 'card para revisar hoje', 'cards para revisar hoje')}</b><div class="sub">Inclui os novos dos tópicos já estudados (até 20 por dia).</div><div class="btns"><button class="btn pri" data-act="cardsHoje">${ic('cards')}Começar revisão</button></div></div>`
    : `<div class="card bloco"><b>Nenhum card pendente hoje</b><div class="sub">${app.c.topicos.some(t => estudado(t.id)) ? 'Volte amanhã: os próximos aparecem na data certa.' : 'Os cards entram na revisão quando você marca o tópico como estudado. Você também pode praticar um tópico abaixo.'}</div></div>`;
  h += `<h2>Praticar por tópico</h2>`;
  for (const a of app.c.areas) {
    const ts = app.c.topicos.filter(t => t.area === a.id && cardsDe(t.id).length); if (!ts.length) continue;
    h += `<div class="area-h"><i class="sw" style="--c:${corArea(a)}"></i><h2>${esc(a.nome)}</h2></div><div class="sec">${ts.map(t => { const d = dominioCards(t.id); return `<button class="item" data-act="cardsTopico" data-id="${t.id}"><div class="grow"><div class="t" style="white-space:normal">${esc(t.nome)}</div><div class="meta">${cardsDe(t.id).length} cards · domínio ${Math.round((d || 0) * 100)}%${estudado(t.id) ? '' : ' · tópico ainda não estudado'}</div>${barra((d || 0) * 100, 'ok')}</div>${ic('play')}</button>`; }).join('')}</div>`;
  }
  if (!total) h += vazio('Nenhum flashcard ainda', 'Eles chegam com os pacotes de estudo.');
  return h;
}
telas.cards = { render };

function iniciar(titulo, cards) {
  if (!cards.length) return aviso('Nenhum card aqui');
  S = { titulo, cards, i: 0, virado: false, certos: 0 };
  if (document.getElementById('sheetWrap').classList.contains('on')) { fecharFolha(true); history.replaceState({ cards: 1 }, ''); } else history.pushState({ cards: 1 }, '');
  $('#quiz').classList.add('on'); document.body.style.overflow = 'hidden';
  desenhar();
}
acoes.cardsHoje = () => iniciar('Revisão de hoje', cardsParaHoje());
acoes.cardsTopico = el => { const t = topico(el.dataset.id); iniciar(t.nome, embaralhar(cardsDe(t.id))); };

function desenhar() {
  const box = $('#quiz');
  if (S.i >= S.cards.length) {
    box.innerHTML = `<div class="qz"><div class="qz-top"><button class="iconbtn sm" data-act="cardsSair" aria-label="Fechar">${ic('x')}</button><div class="grow"><b>${esc(S.titulo)}</b></div></div>
    <div class="card placar"><b>${S.cards.length}</b><div class="sub">cards revisados · ${S.certos} lembrados</div></div><p class="note">Os que você errou voltam amanhã; os que acertou voltam em intervalos cada vez maiores.</p></div>
    <div class="qz-bar"><div><button class="btn pri" data-act="cardsSair">Concluir</button></div></div>`;
    return;
  }
  const c = S.cards[S.i], t = topico(c.topico), a = t && area(t.area);
  box.innerHTML = `<div class="qz">
  <div class="qz-top"><button class="iconbtn sm" data-act="cardsSair" aria-label="Sair">${ic('x')}</button><div class="grow"><b>${esc(S.titulo)}</b><br>Card ${S.i + 1} de ${S.cards.length}</div></div>
  ${barra((S.i + 1) / S.cards.length * 100)}
  <div class="qz-tag">${esc(a ? a.nome : '')} › ${esc(t ? t.nome : '')}</div>
  <button class="card card-flash" data-act="cardVirar"><span class="lado">Pergunta</span>${esc(c.frente)}${S.virado ? `<div class="verso"><span class="lado">Resposta</span><br>${esc(c.verso)}</div>` : '<span class="sub" style="margin-top:16px">Toque para ver a resposta</span>'}</button>
  </div>
  <div class="qz-bar"><div>${S.virado ? `<div class="av3"><button class="btn verm" data-act="cardNota" data-n="0">Errei<small>amanhã</small></button><button class="btn verd" data-act="cardNota" data-n="1">Acertei<small>alguns dias</small></button><button class="btn" data-act="cardNota" data-n="2">Fácil<small>mais tarde</small></button></div>` : '<button class="btn pri" data-act="cardVirar">Mostrar resposta</button>'}</div></div>`;
}
acoes.cardVirar = () => { if (!S.virado) { S.virado = true; desenhar(); } };
acoes.cardNota = el => {
  const n = Number(el.dataset.n), c = S.cards[S.i];
  avaliarCard(c.id, n); if (n > 0) S.certos++;
  salvar(); S.i++; S.virado = false; desenhar();
};
acoes.cardsSair = () => history.back();
addEventListener('popstate', () => { if (S && $('#quiz').classList.contains('on')) { $('#quiz').classList.remove('on'); $('#quiz').innerHTML = ''; document.body.style.overflow = ''; S = null; app.render(); } });
