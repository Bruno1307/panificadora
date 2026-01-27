# Passo a passo simples para atualizar o sistema sem riscos

1. **Faça backup do banco de dados**
   - Execute o script de backup:  
     `sh backend/backup_db.sh`
   - Guarde o arquivo gerado (fica na pasta `backend/backups/`).

2. **Teste as novidades**
   - No seu computador, faça as mudanças e teste tudo.
   - Use o comando de testes:  
     `sh backend/run_pytest.sh`
   - Só siga se todos os testes passarem.

3. **Prepare a atualização**
   - Envie as mudanças para o repositório principal (branch `main` ou `master`).
   - No servidor, atualize o código:
     `git pull origin main`

4. **Atualize o banco de dados (se necessário)**
   - Se houver mudanças no banco, rode as migrações:
     `alembic upgrade head`

5. **Atualize o sistema em produção**
   - Suba os containers novamente:
     `docker-compose -f docker-compose.nginx.yml up -d --build`

6. **Verifique se está tudo funcionando**
   - Veja os logs para checar se não há erros:
     `docker-compose logs -f`

7. **Se der problema, faça rollback**
   - Pare o sistema:
     `docker-compose down`
   - Restaure o backup do banco:
     `sh backend/restore_db.sh`
   - Suba o sistema novamente.

## Checklist rápido
- [ ] Backup feito
- [ ] Testes passaram
- [ ] Código atualizado
- [ ] Migração aplicada (se precisar)
- [ ] Sistema atualizado
- [ ] Verificação feita
- [ ] Rollback testado

Guarde este roteiro e siga sempre que for atualizar o sistema. Se quiser, posso adaptar para sua rotina ou criar scripts automáticos para facilitar ainda mais.