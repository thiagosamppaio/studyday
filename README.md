# StudyDay

App de estudo para a prova de **residência multiprofissional — Saúde da Pessoa Idosa (fisioterapia)**.
Funciona no navegador e pode ser instalado no celular como aplicativo (PWA). Abre também sem internet, depois do primeiro acesso.

**Endereço:** https://thiagosamppaio.github.io/studyday/

## O que o app faz

- **Plano de estudos:** monta o cronograma até a data da prova, a partir das horas por dia e dos dias da semana escolhidos. Usa cerca de 70% do tempo para conteúdo novo e reserva dias para a revisão final.
- **Tópicos:** cada tópico tem resumo, leituras indicadas e cronômetro de estudo.
- **Revisões programadas:** quando um tópico é marcado como estudado, o app agenda revisões para 1, 7 e 30 dias depois.
- **Questões:** múltipla escolha com comentário e fonte, em treino por tópico, 10 questões aleatórias ou revisão.
- **Simulados:** escolha de áreas, quantidade e tempo por questão. O gabarito aparece só no final, com o resultado por área.
- **Caderno de erros:** reúne as questões cuja última resposta foi errada.
- **Flashcards:** repetição espaçada (sistema Leitner), liberados conforme os tópicos são estudados.
- **Desempenho:** minutos estudados, acertos por área e tópicos que precisam de reforço (menos de 70% de acertos).
- **Biblioteca:** referências com links e marcação de "lido".

## Instalar no celular

1. Abra o endereço acima no **Chrome**.
2. Toque em **⋮ › Instalar app** (ou "Adicionar à tela inicial").

## Onde ficam os dados

O progresso fica salvo **somente no aparelho** (armazenamento do navegador). Nada é enviado para servidores.
Para não perder o progresso ao trocar de celular ou limpar o navegador, use **Mais › Exportar backup do progresso** e depois **Restaurar backup** no aparelho novo.

## Conteúdo

O app vem **vazio**: todo o conteúdo entra por **pacotes de estudo** (arquivos `.json`), em **Mais › Importar pacote de estudo**. Assim, o mesmo app serve para qualquer assunto.

| Pacote | Conteúdo |
|---|---|
| `studyday-pacote-1.json` | Saúde da Pessoa Idosa – Áreas 1 a 4 (políticas e direitos, SUS, envelhecimento, avaliação e fragilidade) |
| `studyday-pacote-2.json` | Saúde da Pessoa Idosa – Áreas 5 a 8 (quedas e marcha, condições crônicas, cuidados paliativos, fisioterapia geriátrica) |

- Importar um pacote **não apaga** o progresso.
- **Remover** um pacote (Mais › Conteúdo) tira o conteúdo do app, mas guarda o progresso; se o pacote for importado de novo, tudo volta.
- As questões citam a fonte no comentário — em caso de dúvida, vale conferir a fonte.

## Para atualizar o app

Envie os arquivos novos para este repositório (**Adicionar arquivo › Enviar arquivos**), substituindo os antigos. O app busca a versão nova sozinho na próxima vez que for aberto com internet.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html`, `sd.css` | Página e visual |
| `sd-main.js` | Início do app e navegação |
| `sd-dados.js` | Carregamento do conteúdo e progresso salvo |
| `sd-logica.js` | Cronograma, revisões, simulados, flashcards e estatísticas |
| `sd-ui.js`, `sd-util.js` | Componentes de tela e utilidades |
| `tela-*.js` | Telas: Hoje, Plano, Questões, Cards e Mais |
| `manifest.json`, `sw.js`, `icon-*.png` | Instalação e funcionamento offline |

Formato dos pacotes de conteúdo: JSON com `"formato": "studyday-pacote"`, contendo `areas`, `referencias`, `topicos`, `questoes` e `cards`.
