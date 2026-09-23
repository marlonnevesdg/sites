# Projetos & Produtos

App pessoal para listar gastos planejados, organizados por projeto. Cada produto tem
foto, valor, link de venda, descrição e frequência de compra. Roda offline, sem conta,
sem servidor na nuvem — tudo fica no seu computador.

---

## Como abrir

**Dois cliques no `index.html`.** Abre em *modo arquivo*: não usa banco, os dados vêm
do `.prjz` que você importar e ficam na memória enquanto a aba estiver aberta. Para
gravar, use Exportar. Um selo no topo avisa quando há alteração não exportada, e o
navegador pergunta antes de fechar a aba.

**Dois cliques no `iniciar.cmd`.** Sobe um servidor local e abre o navegador. Aqui o
app usa IndexedDB e **salva sozinho** a cada alteração. Precisa do Node.js instalado.

> O Chrome simplesmente ignora pedidos ao IndexedDB em páginas abertas por `file://` —
> não dá erro, a chamada nunca responde. Por isso os dois modos existem.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | o app inteiro: marcação, estilo e lógica num arquivo único |
| `servidor.js` | servidor estático local (usado pelo `iniciar.cmd`) |
| `iniciar.cmd` | atalho para subir o servidor |
| `*.prjz` | seus dados |

---

## O formato `.prjz`

É um **ZIP comum** com extensão trocada. Pode renomear para `.zip` e abrir em qualquer
descompactador. Dentro:

```
manifest.json                     índice
projects/01-casa---geral.json     um JSON por projeto
projects/08-estudio.json
images/<hash>.webp                imagem binária (sem base64)
thumbs/<hash>.webp                miniatura da imagem de mesmo hash
```

O ZIP é escrito e lido pelo próprio `index.html`, sem biblioteca externa. JSONs entram
comprimidos (deflate); imagens entram sem compressão, porque já são formatos comprimidos.

### `manifest.json`

```json
{
  "format": "projprod",
  "version": 1,
  "app": "Projetos & Produtos — Offline",
  "createdAt": "2026-09-11T14:04:22.031Z",
  "projects": [
    { "file": "projects/01-casa---geral.json", "id": "<uuid>", "name": "Casa - Geral", "products": 8 }
  ],
  "images": { "count": 235, "bytes": 13213133 }
}
```

`format` precisa ser exatamente `projprod`, senão o app recusa o arquivo.

### `projects/<n>-<nome>.json`

```json
{
  "project": {
    "id": "6801a7ef-b880-42a2-9a9d-8ab94949696a",
    "name": "Estúdio",
    "description": "Pequeno estúdio onde eu posso gravar…",
    "cover": "images/839319901afdd2c9970f84fa3a1a8718.webp",
    "createdAt": 1762889164549,
    "updatedAt": 1762890481780,
    "order": 7
  },
  "products": [
    {
      "id": "0e3d3245-40ec-4676-b62b-baaa89e47e05",
      "projectId": "6801a7ef-b880-42a2-9a9d-8ab94949696a",
      "order": 9,
      "name": "Prato Freq Ride 21\" — Sabian AAX",
      "description": "Ride de 21\" (53 cm) da linha AAX…",
      "price": 3500,
      "link": "",
      "search": "Sabian AAX Freq Ride 21 221XFR",
      "image": "images/7f41cbeccad4ad9ff0921f4516956d9b.webp",
      "imagePath": "",
      "gallery": [
        "images/67f481408e06540164804e2bbc67e63e.jpg",
        "images/15ab752b95223ac892220ce305af1605.jpg"
      ],
      "frequency": "cinco-anos",
      "createdAt": 1789131569379,
      "updatedAt": 1789131569379
    }
  ]
}
```

**Campos do produto**

| campo | tipo | observação |
|---|---|---|
| `id` | uuid | único |
| `projectId` | uuid | precisa bater com o `id` do projeto do mesmo arquivo |
| `order` | número | posição dentro do projeto, começando em 0 |
| `name` | texto | obrigatório |
| `description` | texto | pode ser vazio |
| `price` | número | em reais, sem formatação (`3500`, não `"R$ 3.500,00"`) |
| `link` | texto | URL da loja, ou vazio |
| `search` | texto | o que jogar no Google ao clicar na lupa |
| `image` | caminho | a foto principal, apontando para `images/…` |
| `imagePath` | texto | caminho/URL externo; só usado quando `image` está vazio |
| `gallery` | lista | fotos extras, mesmo formato de `image` |
| `frequency` | código | ver tabela abaixo, ou `""` |

**Valores válidos de `frequency`**

| código | aparece como |
|---|---|
| `unica` | Compra única |
| `mensal` | 1 vez por mês |
| `bimestral` | 2 em 2 meses |
| `trimestral` | 3 em 3 meses |
| `semestral` | 6 em 6 meses |
| `anual` | 1 vez ao ano |
| `cinco-anos` | Dura uns 5 anos |

### Imagens

- Nome do arquivo = **SHA-256 do conteúdo**, primeiros 32 caracteres hex. Imagens
  idênticas viram um registro só.
- Extensão de acordo com o formato real (o app confere os primeiros bytes, não confia
  no `Content-Type`).
- Ao entrar no app, toda imagem é reprocessada: **máximo 1080×1080, WebP qualidade 50%**.
  Quem já está dentro desse limite e abaixo de 500 KB passa intacta — por isso reimportar
  não vai degradando a qualidade a cada volta.
- `thumbs/<hash>.webp` é a versão de até 512px, também qualidade 50%, usada nos cards e
  na lista. Se o container já traz a miniatura, o app entende que a imagem foi processada
  por ele e não recomprime.
- **Teto de 5 imagens por produto** (a principal conta). O que passar disso é ignorado.

---

## Para editar o arquivo com ajuda de IA

O jeito mais seguro de acrescentar produtos é **mexer no `.prjz` direto**, sem passar
pelo app:

1. Descompactar o `.prjz` (é ZIP).
2. Editar o JSON do projeto: acrescentar o objeto do produto em `products`, com `order`
   igual ao tamanho da lista e `projectId` igual ao `id` do projeto.
3. Atualizar a contagem `products` daquele projeto no `manifest.json`.
4. Colocar as fotos em `images/` com nome qualquer (o app recalcula o hash e recomprime
   na importação, já que não haverá `thumbs/` correspondente).
5. Recompactar mantendo a estrutura de pastas.
6. Importar no app.

Não precisa gerar miniatura nem comprimir nada à mão — o app faz isso ao importar.

### Buscando imagens

Quando pedir para procurar fotos de um produto:

- **Imagens quadradas da internet, e só.** Sem remover fundo, sem recortar, sem
  tratar, sem montar composição. Baixar como está e usar.
- Conferir que a foto é **do produto certo** antes de usar — foto genérica de outro
  modelo não serve.
- No máximo 5 por produto.
- Preço em real precisa ser verificado; se não achar, deixar claro que é estimativa.

---

## Detalhes que podem confundir depois

- **Banco:** IndexedDB `projprod_db_v2`, versão 3, com os stores `projects`, `products`
  e `images`. As imagens ficam como Blob no store `images`; os registros guardam só a
  referência `idb:<hash>`.
- **Memória:** o app mantém no máximo ~48 MB de imagens vivas ao mesmo tempo, liberando
  as que saíram da tela. Cards e lista usam a miniatura; a imagem cheia só aparece no
  editor e na tela cheia.
- **Modo de exibição** (grade/lista) fica no `localStorage`, chave
  `projprod_layout_produtos`.
- **Importar** com 1 arquivo pergunta se quer substituir tudo ou somar ao que já existe.
- **Exportar** dentro de um projeto gera um `.prjz` só daquele projeto.
- O app ainda lê os `.json` do formato antigo (com imagem em base64) e converte na hora.
