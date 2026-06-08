CREATE TABLE imoveis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL CHECK (tipo IN ('casa', 'apartamento', 'terreno', 'comercial', 'rural')),
    finalidade TEXT NOT NULL CHECK (finalidade IN ('venda', 'aluguel')),
    cidade TEXT NOT NULL,
    bairro TEXT NOT NULL,
    endereco TEXT NOT NULL DEFAULT '',
    preco REAL NOT NULL,
    area_m2 REAL NOT NULL DEFAULT 0,
    quartos INTEGER NOT NULL DEFAULT 0,
    banheiros INTEGER NOT NULL DEFAULT 0,
    vagas_garagem INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'alugado')),
    destaque INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_imoveis_status ON imoveis(status);
CREATE INDEX idx_imoveis_destaque ON imoveis(destaque);

CREATE TABLE fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    caminho_original TEXT NOT NULL,
    caminho_thumb TEXT NOT NULL,
    caminho_grande TEXT NOT NULL,
    principal INTEGER NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_fotos_imovel_id ON fotos(imovel_id);

CREATE TABLE configuracao (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nome_imobiliaria TEXT NOT NULL DEFAULT '',
    logo_path TEXT NOT NULL DEFAULT '',
    cor_primaria TEXT NOT NULL DEFAULT '#1d4ed8',
    cor_secundaria TEXT NOT NULL DEFAULT '#64748b',
    endereco TEXT NOT NULL DEFAULT '',
    telefone TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    instagram_url TEXT NOT NULL DEFAULT '',
    texto_sobre TEXT NOT NULL DEFAULT '',
    texto_home TEXT NOT NULL DEFAULT ''
);

INSERT INTO configuracao (id) VALUES (1);

CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
