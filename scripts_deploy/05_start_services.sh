#!/bin/bash
# Script para iniciar os serviços do sistema após atualização
# Ajuste o nome do serviço conforme necessário

sudo systemctl start padaria-pdv.service

echo "Serviço padaria-pdv.service iniciado."
