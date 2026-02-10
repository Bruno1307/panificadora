## Divisão automática da tela (PDV em dois navegadores)

- Pré-requisitos: `wmctrl` e `xdotool` instalados

```bash
sudo apt update
sudo apt install -y wmctrl xdotool
```

- Execução padrão (abre e tenta dividir automaticamente):

```bash
DUAL=1 KIOSK=0 GUEST_LEFT=1 GUEST_RIGHT=0 scripts_deploy/start_pdv_browser.sh
```

- Variáveis úteis:
  - `USE_KEY_SNAP=1`: usa teclas do desktop (Super+Left/Right) como fallback
  - `MARGIN_X`/`MARGIN_Y`: compensar barras/painéis do desktop

Exemplos:

```bash
USE_KEY_SNAP=1 DUAL=1 scripts_deploy/start_pdv_browser.sh
MARGIN_Y=30 DUAL=1 scripts_deploy/start_pdv_browser.sh
```

- Reposição manual/forçada (após abrir):

```bash
scripts_deploy/position_pdv_windows.sh
```

- Observações:
  - Em alguns gerenciadores de janelas, estados como "shaded", maximizado ou fullscreen impedem redimensionamento; o script remove esses estados antes de posicionar.
  - Em Wayland, o script força XWayland para melhor controle. Em X11 padrão, o controle é mais confiável.
  - Para garantia total, considerar integrar `devilspie2` com regras por `WM_CLASS` (`pdv-left`/`pdv-right`).

# Guia de Deploy Seguro e Desenvolvimento Contínuo

## 1. Estrutura de Ambientes
- **Desenvolvimento:** Use `docker-compose.yml` padrão.
- **Produção:** Use `docker-compose.nginx.yml` ou um arquivo dedicado (ex: `docker-compose.prod.yml`).
- Separe variáveis de ambiente (ex: `.env.dev`, `.env.prod`).

## 2. Branches Git
- `main` ou `master`: sempre estável, espelha produção.
- `develop`: para desenvolvimento contínuo.
- Crie branches de feature/hotfix a partir de `develop`.
- Faça merge em `main` apenas após testes e validação.

## 3. Backup e Rollback
- Antes de atualizar produção:
  - Execute `backend/backup_db.sh` para backup do banco.
  - Guarde o arquivo gerado em `backend/backups/`.
- Para restaurar, use `backend/restore_db.sh`.

## 4. Migrações de Banco
- Use Alembic para criar e aplicar migrações:
  - `alembic revision --autogenerate -m "descrição"`
  - `alembic upgrade head`
- Sempre teste migrações em staging antes de produção.

## 5. Testes Automatizados
- Execute `backend/run_pytest.sh` antes de qualquer deploy.
- Corrija todos os testes antes de promover para produção.

## 6. Deploy Seguro
1. Faça backup do banco.
2. Faça pull da branch `main`.
3. Execute testes.
4. Aplique migrações Alembic.
5. Suba os containers de produção:
   ```sh
   docker-compose -f docker-compose.nginx.yml up -d --build
   ```
6. Monitore logs:
   ```sh
   docker-compose logs -f
   ```

## 7. Rollback
- Se necessário, restaure o backup do banco e volte para a imagem anterior do container.

## 8. Checklist de Deploy
- [ ] Backup realizado
- [ ] Testes passaram
- [ ] Migrações aplicadas
- [ ] Deploy realizado
- [ ] Logs monitorados
- [ ] Rollback testado

---

Adapte conforme seu fluxo. Se quiser automatizar ainda mais, posso sugerir scripts ou pipelines CI/CD.