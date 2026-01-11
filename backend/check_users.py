import sqlite3
import os

# Caminho absoluto para backend/data.db na raiz do projeto
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(project_root, 'backend', 'data.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('SELECT username, role FROM users')
print(c.fetchall())
conn.close()
