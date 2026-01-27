# Como configurar o endereço do backend

Se for necessário mudar o endereço do backend (por exemplo, ao trocar de rede, servidor ou IP), siga estes passos simples:

1. Abra o arquivo:
   frontend/public/config.json

2. Edite o valor de BACKEND_URL para o novo endereço do backend. Exemplo:

{
  "BACKEND_URL": "http://NOVO_IP_OU_DOMINIO:8000/"
}

3. Salve o arquivo.

4. Recarregue a página do sistema no navegador (pressione F5).

Pronto! Não é necessário recompilar, rebuildar ou reiniciar o frontend.

Se tiver dúvidas, entre em contato com o suporte.