# Como publicar um texto em Leitura de mercado

Você publica sozinho, direto no GitHub, sem mexer em código. O site se atualiza sozinho em cerca de 2 minutos.

## Passo a passo

1. Abra a pasta de textos: https://github.com/fhcapivara/flavio-barros-site/tree/main/mercado/posts
2. Clique em **Add file** e depois em **Create new file**.
3. Dê um nome ao arquivo, terminando em `.md`. Use letras minúsculas e hífens, sem acentos. Exemplo: `juros-em-queda-e-o-alto-padrao.md`.
4. Copie o modelo abaixo e cole na área de texto.
5. Preencha os campos entre as linhas `---` e escreva o texto embaixo delas. Os intertítulos começam com `##`.
6. Troque o bloco `[LEITURA DO FLÁVIO]` pela sua opinião pessoal. **Importante:** enquanto o texto `[LEITURA DO FLÁVIO]` estiver no arquivo, o texto não é publicado.
7. Clique em **Commit changes** (botão verde) e, na janela que abrir, clique de novo em **Commit changes**.
8. Aguarde cerca de 2 minutos. O texto aparece em https://flaviodebarros.com.br/mercado/

## Modelo para copiar

```
---
titulo: Escreva aqui o título do texto
slug:
categoria: Ribeirão Preto e região
data: 2026-10-01
resumo: Uma ou duas frases que resumem o texto. Aparecem no Google e na lista de textos.
imagem:
fonte_nome:
fonte_url:
---

Escreva o primeiro parágrafo aqui.

Deixe uma linha em branco entre um parágrafo e outro.

## Um intertítulo

Use **negrito** para destacar uma ideia e [um link](https://www.exemplo.com.br) quando precisar.

- Um item de lista
- Outro item de lista

## Minha leitura

[LEITURA DO FLÁVIO] Substitua este parágrafo inteiro, incluindo esta marcação entre colchetes, pela sua opinião pessoal. Enquanto a marcação estiver aqui, o texto não é publicado.
```

## O que vai em cada campo

- **titulo**: o título do texto.
- **categoria**: copie exatamente uma destas opções:
  - Ribeirão Preto e região
  - Patrimônio, juros e tributos
  - Investir e comercial
  - Terreno e projeto
  - Bairros e condomínios
- **data**: no formato ano-mês-dia. Exemplo: `2026-10-15`.
- **resumo**: uma ou duas frases. É o que aparece no Google e na lista de textos.
- **imagem**: opcional. Veja a seção abaixo. Se não usar, deixe em branco.
- **fonte_nome** e **fonte_url**: opcionais. Nome e endereço da fonte de um dado citado. Exemplo: `fonte_nome: Banco Central` e `fonte_url: https://www.bcb.gov.br`.
- **slug**: opcional. Se ficar em branco, o endereço da página é criado a partir do título. Só preencha se quiser um endereço diferente, por exemplo `slug: juros-e-alto-padrao` (letras minúsculas, sem acentos, com hífens).

Para guardar um texto sem publicar, acrescente a linha `rascunho: true` entre as linhas `---`. Para publicar, apague essa linha.

## Como colocar uma imagem

1. Abra a pasta https://github.com/fhcapivara/flavio-barros-site/tree/main/images/mercado.
2. Clique em **Add file**, depois em **Upload files**, arraste a foto e clique em **Commit changes**.
3. Use nomes simples, sem acentos e sem espaços. Exemplo: `vista-condominio.jpg`. Prefira fotos horizontais com até 500 KB.
4. No texto, preencha o campo assim: `imagem: images/mercado/vista-condominio.jpg`

Envie a imagem antes de publicar o texto.

## Editar ou apagar um texto

- **Editar**: abra o arquivo na pasta `mercado/posts`, clique no ícone de lápis, altere e clique em **Commit changes**.
- **Apagar**: abra o arquivo, clique nos três pontinhos no canto superior direito, escolha **Delete file** e confirme em **Commit changes**. A página sai do site automaticamente.

## Se o texto não aparecer

Confira primeiro se o bloco `[LEITURA DO FLÁVIO]` foi substituído pela sua opinião. Enquanto ele estiver no arquivo, o texto fica guardado, mas não é publicado.


Se um campo estiver faltando ou com erro (por exemplo, a data em outro formato ou uma categoria diferente das cinco opções), o texto não é publicado e o GitHub envia um e-mail avisando. Os detalhes aparecem na aba **Actions** do repositório. Corrija o arquivo e clique em **Commit changes** de novo.

Observação: o arquivo `_modelo.md` é apenas o modelo e nunca é publicado. Arquivos cujo nome começa com `_` são ignorados.

# Como publicar um dossiê (estudo em PDF enviado pelo WhatsApp)

Os dossiês têm seção própria, separada da Leitura de mercado: https://flaviodebarros.com.br/estudos/ (item "Dossiês" do menu; o endereço continua /estudos/). Os endereços antigos em /mercado/estudos/ continuam funcionando e levam automaticamente para /estudos/. Cada dossiê publicado aparece também no rodapé de todas as páginas, na coluna "Dossiês em PDF", com o link "Ver todos os dossiês". Para pedir um dossiê, o visitante clica em **Receber o dossiê em PDF** e informa apenas o nome. O site abre uma conversa no seu WhatsApp, (16) 99116-6681, com a mensagem pronta:

"Olá, Flávio, meu nome é Maria Silva e gostaria de receber o material Residencial Barão de Campo Belo."

Você responde e envia o material pela própria conversa. O nome serve apenas para montar a mensagem: o site não grava nem envia esse dado a nenhum servidor.

**Importante:** o PDF do dossiê nunca vai para o GitHub. Guarde-o no seu computador ou no Google Drive para enviar pelo WhatsApp.

## Passo a passo

1. **Capa (opcional).** Envie a imagem da capa para `images/estudos/` com um nome novo, por exemplo `residencial-exemplo-capa-2026-10.webp` (largura de 1400 px é suficiente).
2. **Página do dossiê.** Na pasta https://github.com/fhcapivara/flavio-barros-site/tree/main/estudos, crie um arquivo `.md` copiando o `_modelo.md`. Preencha os campos e faça o commit.
3. Em cerca de 2 minutos o dossiê aparece no site, na página Dossiês e no rodapé. Teste você mesmo: clique no botão, informe um nome e confira se a mensagem chega certa no WhatsApp.

## Campos do dossiê

- **titulo**: título que aparece na página e nos cartões.
- **titulo_seo**: opcional. Título para o Google e a aba do navegador.
- **slug**: opcional. Endereço da página. Em branco, é criado a partir do título.
- **id**: opcional. Identificador interno do estudo. Em branco, usa o slug.
- **material**: opcional. Nome do estudo na mensagem de WhatsApp. Em branco, usa o título até os dois-pontos (por exemplo, "Residencial Barão de Campo Belo").
- **tipo**: por exemplo `Estudo de lançamento` ou `Estudo de região`.
- **data**: ano e mês, no formato `2026-10`. Aparece como "Outubro de 2026".
- **atualizado**: opcional. Data da última revisão da página, no formato `2026-10-15`. Informa o Google sobre a atualização.
- **resumo**: abertura em dois parágrafos, separados por ` | `. O primeiro é uma pergunta; o segundo diz o que o estudo analisa e o que não aparece no material de divulgação. Aparece no topo da página e nos cartões.
- **descricao**: texto para o Google e para o compartilhamento, com o número de páginas e "Receba pelo WhatsApp".
- **resumo_curto**: opcional. Texto para os cartões. Em branco, usa o resumo.
- **titulo_lista**: opcional. Título da lista. Em branco, usa "O que você encontra no estudo:".
- **o_que_responde**: 4 temas do estudo, separados por ` | `, escritos sem as respostas. Viram uma lista.
- **Texto abaixo do bloco de campos**: fechamento com o número de páginas e o convite, por exemplo "São 16 páginas de análise feitas por mim. Peça o seu e eu envio pessoalmente pelo WhatsApp."
- **regiao**, **lancamento**, **paginas**: aparecem no quadro lateral do estudo.
- **imagem**: opcional. Caminho da capa, por exemplo `images/estudos/residencial-exemplo-capa-2026-10.webp`.
- **og_imagem**: opcional. Imagem só para a prévia ao compartilhar o link, de preferência JPG 1200x630 em `images/og/` (o WhatsApp lida melhor com JPG do que com WebP). Em branco, a prévia usa a capa.
- **og_padrao**: opcional. Com `sim`, a prévia ao compartilhar o link (WhatsApp, redes sociais) usa a imagem padrão do site, com o retrato de Flávio, em vez da capa. Use quando a capa tiver textos que não devem aparecer na prévia. Em branco, a prévia usa a capa.
- **rascunho**: `true` deixa o dossiê fora do site (e fora do rodapé).

Evite na página pública frases de promessa (retorno, valorização garantida) e valores. Os números ficam no material enviado.
