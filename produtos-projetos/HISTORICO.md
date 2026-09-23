# Histórico de alterações

Ordem cronológica do que foi feito no app. O ponto de partida era o
`produtos-v9.html` — arquivo único, imagens em base64 dentro dos registros.

---

## 1. Diagnóstico inicial

O app funcionava; o que parecia defeito era outra coisa:

- A primeira abertura depois de importar demorava vários segundos sem dar sinal de vida,
  por causa de uma imagem de 32 MB. Parecia travado, mas estava carregando.
- Confirmado que os `.json` exportados abriam normalmente — 16 projetos, 166 produtos,
  R$ 134.688,00.

## 2. Imagens fora dos registros

As imagens saíram de dentro dos registros e foram para um store próprio no IndexedDB,
guardadas como Blob. Os registros passaram a guardar só a referência `idb:<hash>`.

| | antes | depois |
|---|---|---|
| Registros de projetos e produtos | 67,9 MB | 0,11 MB |
| Imagens em memória ao navegar | tudo de uma vez | menos de 1 MB |

Junto veio o carregamento sob demanda: cada foto só é buscada quando entra na tela
(400px de antecedência) e é liberada quando sai, com teto de 48 MB.

## 3. Formato `.prjz`

Container ZIP com extensão própria, escrito e lido pelo próprio app, sem biblioteca:
`manifest.json` + um JSON por projeto + imagens binárias + miniaturas.

O arquivo caiu de 68 MB (JSONs com base64) para 53,7 MB. Depois da compressão
(item 6), foi para 15 MB.

**Problema encontrado:** duas imagens gigantes (22 MB e 9,7 MB) sendo exibidas como
miniatura de 18px ocupavam 2/3 do orçamento de memória e provocavam um efeito de
carrega-descarrega que deixava imagens quebradas. Resolvido gerando miniaturas de 512px.

## 4. Separação em arquivos

`produtos-v10.html` virou `index.html` + `app.css` + `app.js`. Removida uma chamada
morta ao CDN do lucide, que nunca era usada (os ícones são SVG inline).

## 5. Tela de carregamento

Barra de progresso com etapa, contagem e porcentagem, em três momentos: abertura,
importação e exportação. O `alert` de erro foi substituído por um painel que explica
o motivo provável e o que fazer.

**Dois defeitos aparecidos aqui:**

- O app congelava com a janela em segundo plano, porque a barra dependia de
  `requestAnimationFrame`, que não dispara em aba oculta. Corrigido com um timeout
  em paralelo.
- O `uiTick` marcava o instante de descanso *antes* de esperar, então cedia a vez a
  cada item — 552ms por chamada em segundo plano. Uma importação chegou a levar 73s;
  depois do ajuste, 1,7s.

## 6. Compressão

Imagem completa em **1080px / qualidade 50%**, miniatura em **512px / qualidade 50%**,
ambas WebP.

| | antes | depois |
|---|---|---|
| Imagens no app | 50,9 MB | 11,5 MB + 2,9 MB de miniaturas |
| Maior imagem | 22 MB | 401 KB |
| Arquivo `.prjz` | 53,7 MB | 14,5 MB |

Imagens já dentro do limite não são recomprimidas, então reimportar não degrada a
qualidade. Importar um `.prjz` que já traz miniaturas pula a recompressão — foi o que
derrubou a importação de 3 minutos para segundos.

## 7. Modo arquivo

Descoberto por teste no Chrome real: em `file://`, `indexedDB.open()` **nunca responde** —
não dispara sucesso nem erro. Por isso o duplo clique travava sem mensagem.

A camada de dados passou a ter dois modos: **banco** (IndexedDB, salva sozinho, via
`iniciar.cmd`) e **memória** (sem banco, dados vindos do `.prjz`, via duplo clique).
O app escolhe sozinho, com um selo no topo avisando qual está ativo e se há alteração
não exportada.

Criados o `iniciar.cmd` e o `servidor.js` para quem quiser o salvamento automático.

## 8. Galeria e edição do produto

- Galeria de verdade no editor: upload de várias imagens, remover uma a uma, reordenar
  arrastando. Antes só aceitava caminhos digitados.
- Editor reorganizado: nome numa linha; valor e frequência em duas colunas; pesquisa
  Google e projeto em duas colunas.
- Campo **frequência** (dropdown com 7 opções).
- Botão de upload solto e campo de caminho removidos. Com imagem, aparece uma lixeira
  no canto; sem imagem, a própria moldura vira área de upload.
- Campos padronizados em 47px — os selects tinham 47 e os inputs 41, desalinhando.

## 9. Card do produto e página do produto

- Card virou **só a imagem**, quadrada, com nome, valor e ícones aparecendo no hover.
  Sem descrição, sem categoria, sem setas.
- Criada a **página do produto**: cartão centralizado, fundo desfocado, que entra
  deslizando.
- Pilha de imagens: uma foto por vez, as outras como ressaltos abaixo. Clique na metade
  de cima volta, na de baixo avança; a roda do mouse faz o mesmo; ciclo infinito.
  A base da pilha alinha com o rodapé do texto e o topo transborda por cima do cartão.
- Teto de 5 imagens por produto.
- Botões viraram ícones, com o editar mais apagado que os outros.

**Defeitos corrigidos no caminho:**

- Com `scale` ancorado no topo, o encolhimento anulava o deslocamento e os ressaltos
  ficavam com 0px. Trocado por `scaleX`.
- As imagens pararam de carregar depois da mudança do card: o observador era acionado
  enquanto o elemento ainda estava fora do documento. Agora espera ele entrar no DOM.
- Preço saía duplicado ("R$R$ 315,00") porque o formatador usa espaço fixo (NBSP) e o
  código comparava com espaço comum.
- Seta do carrossel não trocava a imagem, porque usava carregamento preguiçoso num
  elemento já visível.

## 10. Modo lista

Alternador grade/lista nas duas telas de produtos, sincronizado entre elas e lembrado
entre sessões. A lista mostra miniatura, nome, frequência, valor e ícones em colunas
alinhadas, em linhas de 52px.

**Defeitos corrigidos:** `renderProjectProducts` reescrevia a classe da grade e derrubava
o modo lista ao trocar de projeto; e a coluna de ícones variava de largura conforme o
produto tivesse link ou não, desalinhando o resto.

## 11. Desempenho

`getProductsByProject` passou a reler a tabela inteira a cada chamada — dezenas de vezes
por tela — e o boot travava em 88% por mais de 8 segundos. Resolvido com cache
invalidado a cada escrita. O store de imagens fica **fora** do cache de propósito:
guardar os blobs na memória anularia o carregamento sob demanda.

## 12. Dados

- Convertidos os 18 JSONs da pasta `Atualizados` para o novo padrão: 215 produtos,
  232 imagens extraídas do base64 e comprimidas.
- Acrescentado o **Prato Freq Ride 21" — Sabian AAX** ao Estúdio, com 3 fotos.
  Correção: o Freq Ride é da linha **AAX**, não HHX. Das 5 fotos baixadas, 2 eram de
  outro prato (X-Plosion Ride) e foram descartadas.
- Reescrita a descrição do projeto **Experiências**, que era sobra do antigo "Fim de Ano".
- Valor do prato (R$ 3.500) é estimativa — não foi encontrado preço no Brasil.

**Defeito corrigido:** duas imagens ficaram gravadas como `.bin` porque o servidor de
teste devolvia `.jpg` como `application/octet-stream`. O app passou a identificar o
formato pelos primeiros bytes, sem confiar no `Content-Type`.

## 13. Acabamento

- Página do produto mais estreita (820px) e centralizada, com fundo desfocado.
  Centralização por margem automática, porque `left:50%` deixava um viés de 16px —
  a largura da barra de rolagem.
- Ressaltos da pilha passaram a usar um tom claro do próprio app
  (`rgba(230,233,239,.13)`) em vez de cor tirada de cada foto. A curva de opacidade foi
  suavizada para os cinco degraus continuarem visíveis.
- Valores removidos da barra lateral; sobrou capa e nome.
- Removido o contador "1 / 3" da pilha.

## 14. Rolagem, topo fixo, salvamento e arrasto

### Imagens pretas piscando

Três causas somadas:

- **Despejo cego.** O teto de memória soltava sempre as entradas mais antigas do cache,
  inclusive as que estavam na tela naquele instante. A imagem perdia o `src`, voltava
  para a fila, carregava de novo e empurrava outra visível para fora — carrega-descarrega
  sem fim. Agora o despejo pula tudo que algum elemento ainda no documento esteja
  exibindo; só passa por cima disso se o que está na tela sozinho já dobrar o teto.
- **Carga em fila indiana.** O observador percorria as imagens com `await` dentro do
  laço: cada card esperava a ida e volta ao IndexedDB do anterior. Rolando rápido, o
  card ficava segundos mostrando só o fundo. Passou a carregar em paralelo, com no
  máximo 8 pedidos ao mesmo tempo.
- **O brilho infinito.** Toda imagem sem `src` tinha um degradê escuro animado em laço.
  Dezenas deles rodando durante a rolagem eram, literalmente, o "preto piscando". Virou
  superfície parada, e a foto entra com um esmaecimento de 0,18s.

A margem de antecipação subiu de 400px para 800px, e um card reaproveitado para outro
produto no meio do caminho não recebe mais a imagem antiga.

### Topo do projeto fixo

A barra com nome, total e ícones subia junto com os cards. Agora é `position:sticky` no
alto da área de produtos, ocupando exatamente o mesmo espaço de antes (margem negativa
desfaz o respiro do `main`, o `padding` devolve por dentro), então nada se desloca ao
entrar. Quando o conteúdo encosta nela, a classe `rolado` reduz a altura, escurece o
fundo com desfoque e encolhe o título — tudo com transição de 0,22s, sem salto. O
gatilho é lido direto no evento de rolagem, sem `requestAnimationFrame`, que não dispara
com a aba em segundo plano.

### Dois botões de salvar

- O botão do topo agora exporta **sempre todos os projetos**, esteja o usuário onde
  estiver. Antes, dentro de um projeto, ele exportava só aquele.
- Novo botão **Salvar Projeto**, ao lado de Editar, exporta só o projeto aberto.

### Arrastar e soltar

O que estava errado:

- **Soltar em cima do pontilhado cancelava o arrasto.** Os eventos `dragover`/`drop`
  estavam nos itens; o pontilhado não é um item, então não aceitava a soltura. O
  navegador cancelava e o objeto voltava para o lugar de origem — na barra lateral isso
  parecia que a ordem não salvava. Agora `dragover` e `drop` ficam no container, que
  cobre também os vãos da grade, o espaço vazio no fim e o próprio pontilhado.
- **A posição do alvo só olhava o eixo Y.** Numa grade de várias colunas isso erra.
  A regra passou a ser a combinada: por cima de um item, o arrastado vai **depois**
  dele; com o ponteiro acima de tudo, vai para a **primeira** posição; num vão, o item
  mais próximo decide o lado.
- **Reordenar era brusco.** Os vizinhos saltavam para a posição nova. Agora andam com
  uma animação FLIP de 170ms — o bastante para a mudança não parecer defeito.
- **A barra lateral redesenhava a tela errada.** O `onDrop` chamava `renderProjects()`,
  que troca a view e tirava o usuário de dentro do projeto aberto. Só redesenha se a
  grade de projetos estiver à vista.
- **O pontilhado da lateral ficava fora da margem.** O placeholder recebia a largura do
  item em pixels; com as margens do `li` por cima, estourava a coluna e sumia. Agora só
  a altura vai inline; a largura vem do container.
- **A soltura de produto redesenhava a grade inteira** logo depois de gravar, o que fazia
  as imagens piscarem e dava impressão de erro. O DOM já está na ordem certa: agora só
  grava.

O lugar de origem **continua ocupado** enquanto se arrasta, com o item apagado. Serve
para desistir (soltar fora devolve o objeto) e para o usuário não perder a referência
do layout.

Os 6 pontinhos de arrastar encolheram e ficaram colados no canto.

### Corrigido logo em seguida

- **A barra ficava 16px abaixo do alto, com uma faixa de imagem aparecendo por cima
  dela.** O Chrome recua o ponto de fixação do `sticky` pela padding do container que
  rola; com `main{padding:16px}`, `top:0` grudava 16px abaixo. A padding de cima saiu do
  `main` e virou padding da própria barra: o respiro é o mesmo e ela cola no alto de
  verdade.
- **Balanço elástico.** O repique de fim de rolagem do Chrome balançava a barra fixa.
  `overscroll-behavior:none` no `main` (a passagem de projeto pela roda do mouse não
  depende dele, então continua funcionando).
- **Fundo translúcido com desfoque.** As imagens passando por trás pareciam defeito;
  virou fundo opaco, com borda e sombra fazendo a separação.
- **"Primeira posição" não funcionava.** Com o ponteiro acima da galeria ele está por
  cima da **barra do topo**, não da grade — e os eventos estavam registrados na grade,
  então nunca chegavam. Agora quem escuta é a **coluna inteira** (o `main`, ou a barra
  lateral) e o container ativo é escolhido pelo arrasto em andamento. Vale igual na
  lateral: soltar em cima do título "Projetos" põe o projeto em primeiro.

### Segunda rodada de correções

- **A grade oscilava ao passar pelo último item de uma linha.** Duas causas empilhadas.
  A primeira: quando o pontilhado entra depois do último item da linha, ele passa a
  ocupar exatamente o ponto onde o ponteiro está — e o cálculo de "item mais próximo",
  medindo em duas dimensões, escolhia um item da linha de cima e mandava tudo de volta.
  Agora, ponteiro em cima do próprio pontilhado não muda nada, e num vão só concorrem
  os itens da mesma linha do ponteiro.
  A segunda, mais grave: a animação de reordenação usa `transform`, e
  `getBoundingClientRect()` devolve a posição **animada**, não a final. Durante os 170ms
  da animação, todo o cálculo trabalhava com posições mentirosas. As medidas passaram a
  sair de `offsetLeft/offsetTop`, que são valores de layout e o `transform` não toca.
  (O "antes" do FLIP continua vindo do rect, de propósito: ali interessa onde o item
  *aparece*, mesmo no meio de outra animação.)

- **O topo do projeto ficou parado de verdade.** Estava encolhendo o nome durante a
  rolagem; o pedido era o contrário — a barra não muda nada enquanto rola: mesmo
  tamanho, mesmo fundo, mesma borda, do começo ao fim. A animação do topo é outra: é a
  passagem para o projeto seguinte.

- **A passagem para o outro projeto não pisca mais.** A camada que desliza entrava com
  os quadrados vazios e as fotos apareciam uma a uma ao chegar no topo do conteúdo.
  Agora ela só começa a subir com as imagens **já carregadas** (com teto de 600ms, para
  a passagem nunca travar esperando), e a grade de verdade também só é revelada pronta —
  as imagens já estão no cache nesse ponto, então é imediato. A barra da camada ganhou
  o mesmo recuo, fundo e borda da barra de verdade, senão o nome dava um salto no
  instante da troca.

### Só o conteúdo rola

As duas tentativas anteriores erravam na origem: o `main` inteiro rolava e a barra do
topo era presa com `position:sticky`. Por isso ela balançava no repique da rolagem,
ficava com um vão no alto e tinha imagem passando atrás dela — sintomas de um remendo,
não de uma estrutura.

A estrutura mudou. Cada tela agora é:

```
section.view          coluna flexível, não rola
  .toolbar            cabeçalho: nome, total, ícones — altura fixa, fora da rolagem
  .view-area          palco: não rola, é onde a passagem de projeto desliza
    .view-corpo       a ÚNICA coisa que rola: a grade de produtos
```

Conteúdo é a grade. Nome, total, busca e ícones não são conteúdo: ficam fora da área de
rolagem, então não sobem, não descem, e nada passa por baixo deles — o conteúdo é
recortado dentro da própria caixa. O `main` não rola mais (medido: `scrollHeight ===
clientHeight`), e a barra fica no mesmo pixel em qualquer posição de rolagem.

A passagem para o projeto seguinte também mudou de escopo: a camada que desliza leva
**só o conteúdo** e acontece dentro do palco, começando exatamente na base da barra. A
barra não se mexe um pixel durante a passagem; quem muda é o texto dela, com nome e
total saindo e voltando com um deslocamento curto, no sentido da rolagem.

## 15. Arquivo único e ajustes de uso

`index.html` + `app.css` + `app.js` voltaram a ser **um arquivo só** (o oposto do item
4). CSS e JS foram colados dentro do `index.html`; `servidor.js` e `iniciar.cmd`
continuam do lado de fora, sem mudança.

### Link de imagem deixou de ser só embed

Um `imagePath` (link colado em "Adicionar por caminho ou link") era guardado como
texto puro e o `<img>` apontava direto para a URL — funcionava, mas dependia do link
continuar no ar para sempre. Se o site de origem trocasse ou apagasse a imagem, ou
adicionasse alguma verificação de cabeçalho, a foto quebrava sem aviso.

Agora, ao salvar, todo link `http(s)://` (imagem principal e itens da galeria por
caminho) passa por `baixarImagemDeURL`: baixa o link com `fetch`, confere que a
resposta é mesmo uma imagem e guarda o blob pelo mesmo caminho de uma foto enviada do
computador (`storeImageBlob` — comprime, tira hash, vira `idb:<hash>`). O link em si
não é mais guardado depois disso.

Isso só funciona quando o site de origem permite o download por CORS — o que já é o
caso de bancos de imagem e da maioria das lojas, mas nem sempre. Se o download falhar
(CORS, rede, ou a resposta não é uma imagem), o app cai de volta no comportamento
antigo: guarda o link direto e avisa, num alerta, que aquela imagem específica pode
quebrar se o link mudar.

### Imagem quebrada não é mais um beco sem saída

Quando o link/arquivo escolhido no editor não abria, a área da foto principal virava
uma mensagem de erro sem botão nenhum — só dava para fechar o modal e desistir. A
mesma área que aparece quando não há imagem (botão "Carregar imagem" + campo de
link) agora também aparece no erro, com o link quebrado pré-preenchido no campo, para
a pessoa escolher um arquivo do computador ou corrigir/trocar o link ali mesmo.

### Barra lateral pode ser ocultada

Novo botão no cabeçalho (ícone ao lado do "‹ Voltar") esconde e mostra a coluna de
projetos, com uma transição curta. O estado fica salvo (`localStorage`,
`projprod_aside_oculta`) e volta do jeito que a pessoa deixou na próxima abertura.

### Atalho de navegar entre produtos no editor

`Ctrl+seta` para ir ao produto anterior/próximo sem sair do editor colidia com
atalhos do sistema/navegador que já usam essa combinação. Passou a ser
`Ctrl+Alt+seta`. `Ctrl+Enter` para salvar não mudou.
