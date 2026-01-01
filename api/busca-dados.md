---
status: Proposta
--- 
# parametros query sobre hierarquia na busca de dados  

## Contexto

É preciso fazer busca e filtro de dados em coleções de dados na API. principalmente para dados hierarquicos, como por exemplo todas turmas de um semestre. E é preciso que essas buscas sejam flexiveis o suficiente para permitir diversos tipos de filtros e ordenações enquanto mantem simplicidade do sistema. 


## Decisão 
Foi escolhido que sera dado preferencia para usar parametros query fazer filtros em buscas de dados ao invez de ordenação.

A escolha se dá para manter um ponto unico de busca de dados de uma certa entidade, evitando complexidade de diversos endpoints para cada tipo de busca.

Então ao inves de ser necessario fazer buscas de todas turmas de um semestre e instituto, será feito apenas uma busca `GET /classes?study-period=31&institute=3`.

## Consequencia

Reduz a quantidade de endpoints na API, simplificando o desenvolvimento e manutenção da API.

Por outro lado pode aumentar a complexidade de filtros e ordenações na API.

Dificula autorização em endpoints sensiveis, não podendo apenas fazer autirização por endpoint, mas sim por cada tipo de filtro.

[1]: https://restfulapi.net/