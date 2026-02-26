# Script de atualização de IP

Este script automatiza a troca do IP em arquivos de configuração e reinicia os serviços necessários.

## Uso

```bash
chmod +x ./atualiza_ip.sh
./atualiza_ip.sh NOVO_IP
```

Exemplo:
```bash
./atualiza_ip.sh 10.90.115.251
```

O script irá:
- Atualizar o IP nos arquivos principais (frontend, nginx, README, backend)
- Reiniciar os serviços Docker (se disponíveis)

> **Atenção:**
> - Revise se há outros arquivos customizados que usam IP fixo.
> - Para alterações em outros locais, adicione novas regras ao script.
