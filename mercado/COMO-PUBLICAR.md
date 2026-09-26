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
  - Crédito e juros
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
