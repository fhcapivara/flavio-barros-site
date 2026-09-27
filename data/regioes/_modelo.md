---
# Página de região do Acervo. Arquivos que começam com "_" são ignorados.
# Copie este modelo para data/regioes/{slug}.md. A página sai em /imoveis/{slug}.html.
#
# Regras automáticas (a cada build):
# - publicado: sim e pelo menos 1 imóvel encontrado: página indexável, no sitemap e listada
#   em "Regiões que acompanho de perto" no Acervo.
# - publicado: sim e nenhum imóvel: página continua no ar com noindex, sai do sitemap e da lista.
#   Volta sozinha quando surgirem imóveis.
# - publicado: não: a página não é gerada.
publicado: não
# slug: endereço curto (letras minúsculas, sem acentos, com hífens). Em branco, usa o nome do arquivo.
slug: nome-da-regiao
# titulo: H1 da página.
titulo: Casas em condomínio no Nome da Região, Ribeirão Preto
# nome: rótulo curto na lista de regiões do Acervo (opcional; em branco, usa o titulo).
nome: Nome da Região
# titulo_seo e descricao (até 155 caracteres) para o Google e o compartilhamento.
titulo_seo: Imóveis à venda no Nome da Região, Ribeirão Preto | Flávio Barros
descricao:
# resumo: parágrafos de abertura separados por " | ".
resumo: Primeiro parágrafo de abertura. | Segundo parágrafo, opcional.
# busca: termos separados por " | ", procurados no bairro, no condomínio e no título do imóvel.
# Acentos, apóstrofos e maiúsculas são ignorados ("Olhos D'Água" = "olhos dagua").
busca: nome da regiao
# busca_bairro (opcional): termos procurados SÓ no campo bairro do imóvel (mais restrito que busca).
busca_bairro:
# tipos (opcional): casa | apartamento | sobrado | terreno. Em branco, todos os residenciais e terrenos.
tipos:
# incluir_comerciais: sim inclui salas, salões, galpões e terrenos comerciais. Padrão: não.
incluir_comerciais: não
---

Texto opcional sobre a região, em parágrafos separados por uma linha em branco. Sem preços,
sem promessas de retorno ou valorização.
