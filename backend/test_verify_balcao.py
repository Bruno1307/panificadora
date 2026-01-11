from app.auth_utils import verify_password

# Hash extraído do banco de dados
hash_balcao = "$2b$12$w449gTaGkqlxmJ3MPLFtIufZkltMXDi16xbbJe8QXBqdyNUXOiBj."

# Teste de senha correta
print("Senha correta:", verify_password("balcao123", hash_balcao))
# Teste de senha incorreta
print("Senha incorreta:", verify_password("senhaerrada", hash_balcao))
