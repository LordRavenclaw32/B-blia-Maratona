# Igrejas licenciadas

Cada arquivo `<endereco>.json` desta pasta publica o app de uma igreja em:

`https://<seu-usuario>.github.io/<repositorio>/igreja/<endereco>/`

1. Monte a igreja no **Configurador** do app (`#/configurar-igreja`) e clique em **Baixar arquivo**.
2. Envie o arquivo para esta pasta (GitHub → *Add file → Upload files*).
3. Em cerca de 2 minutos o link está no ar. Para mudar avisos ou plano, envie o arquivo de novo com o mesmo nome.

- A logo pode estar embutida no arquivo (o configurador já faz isso) ou ser um arquivo nesta pasta (`"logo": "minha-igreja.png"`).
- `acesso.codigo` define um código para os membros entrarem; ele é publicado apenas como hash.
- `_modelo.json` mostra todos os campos (arquivos que começam com `_` são ignorados).
- `exemplo.json` é a igreja de demonstração usada na apresentação (`#/apresentacao`).
