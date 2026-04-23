import sqlite3

# Caminho correto para rodar dentro do container Docker
db_path = '/app/data.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('SELECT username, role FROM users')
print(c.fetchall())
conn.close()
