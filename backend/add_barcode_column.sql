-- Adiciona a coluna barcode à tabela products, se não existir
ALTER TABLE products ADD COLUMN barcode VARCHAR(50);
