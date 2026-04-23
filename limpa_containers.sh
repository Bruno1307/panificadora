#!/bin/bash
# Script otimizado para limpar containers Docker, preservando apenas backend e frontend

PRESERVE=(backend frontend)

# Lista todos os containers em execução (nomes)
ALL_CONTAINERS=$(docker ps --format '{{.Names}}')

# Remove containers não preservados
for NAME in $ALL_CONTAINERS; do
    KEEP=false
    for PRES in "${PRESERVE[@]}"; do
        if [ "$NAME" = "$PRES" ]; then
            KEEP=true
            break
        fi
    done
    if [ "$KEEP" = false ]; then
        docker stop "$NAME"
        docker rm "$NAME"
    fi
done

# Garante que backend e frontend estejam ativos
for PRES in "${PRESERVE[@]}"; do
    RUNNING=$(docker ps --filter "name=^/${PRES}$" --format '{{.Names}}')
    if [ "$RUNNING" != "$PRES" ]; then
        docker start "$PRES" 2>/dev/null || echo "Container $PRES não existe."
    fi
done

echo "Containers limpos. Apenas backend e frontend ativos."
