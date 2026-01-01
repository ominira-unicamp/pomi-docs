---
status: Proposta
--- 
# Padronização de resposta de entidades da api 

## Contexto
É importante que a API tenha uma interface padronizada, para reduzir a sobrecarga de informação ao usala, caso diversas partes da api tenham padrões diferentes de uso, isso cria sobrecarga ao desenvolver/usar cada nova parte. Isso se torna mais importante quando consideramos que é uma API publica, então ao ter um padrão claro, reduz a barreira de uso.

## Decisão 
Todas respostas da api com objeto de um tipo de entidade, responderão com com o mesmo esquema para todas as entidades do mesmo tipo. O esquema da entidade deve possuir a menor quantidade possivel de união ou parametros opcionais. 

Desta forma o cliente da aplicação não ira precisar se preocupar em tratar diversos formatos de como uma entidade é enviada nos diversos endpoints, e para o lado da api é possivel padronizar a criação dessas respostas. 

A nescessidade de poucos esquemas de união ou parametros opcionais por causa que facilita clientes fortementes tipados lerem o resultado, e conseguem diferneçar um campo ausente `{}` de um campo nulo `{"campo": null}`

## Consequencia

Reduz a quantidade de esquemas de resposta da aplicação, portanto uma menor quantidade de esquemas para acompanhar.

Cria um ponto de falha em break changes, onde modificar um esquema modifica resposta de diversos endpoints

Pode acabar retornando informação desneccessaria tornando respostas mais complexas do que o nescessario. 
