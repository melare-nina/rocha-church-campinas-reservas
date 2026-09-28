import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

/**
 * Camada de banco de dados — SQLite puro via better-sqlite3 (síncrono, sem
 * ORM e sem downloads de binários externos em tempo de build/deploy).
 *
 * Guardamos data/hora sempre como TEXTO ("YYYY-MM-DD" / "HH:mm"), nunca como
 * objetos Date, para não sofrer nenhuma conversão de fuso horário.
 */

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "church.db");

function abrirBanco(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      room_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recurrences (
      id TEXT PRIMARY KEY,
      frequencia TEXT NOT NULL,
      dia_semana INTEGER,
      dia_mes INTEGER,
      data_inicio TEXT NOT NULL,
      data_fim TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      nome_responsavel TEXT NOT NULL,
      ministerio TEXT NOT NULL,
      finalidade TEXT,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      ativa INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      nome_responsavel TEXT NOT NULL,
      ministerio TEXT NOT NULL,
      finalidade TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIRMADA',
      recurrence_id TEXT REFERENCES recurrences(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_room_date ON reservations(room_id, date);
    CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
    CREATE INDEX IF NOT EXISTS idx_reservations_recurrence ON reservations(recurrence_id);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedSalas(database);
  seedAdmin(database);

  return database;
}

const SALAS_PADRAO = [
  { name: "Templo", slug: "templo" },
  { name: "Sala Recepção", slug: "sala-recepcao" },
  { name: "Sala Intercessão", slug: "sala-intercessao" },
  { name: "Sala Kids 1", slug: "sala-kids-1" },
  { name: "Sala Kids 2", slug: "sala-kids-2" },
  { name: "Sala Kids 3", slug: "sala-kids-3" },
];

function seedSalas(database: Database.Database) {
  const existente = database.prepare("SELECT COUNT(*) as total FROM rooms").get() as { total: number };
  if (existente.total > 0) return;

  const inserir = database.prepare(
    "INSERT INTO rooms (id, name, slug, room_order) VALUES (?, ?, ?, ?)"
  );
  const transacao = database.transaction(() => {
    SALAS_PADRAO.forEach((sala, i) => {
      inserir.run(crypto.randomUUID(), sala.name, sala.slug, i);
    });
  });
  transacao();
  console.log("[db] Salas padrão criadas.");
}

function seedAdmin(database: Database.Database) {
  const existente = database.prepare("SELECT COUNT(*) as total FROM users").get() as { total: number };
  if (existente.total > 0) return;

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@igreja.org").toLowerCase();
  const senha = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(senha, 10);

  database
    .prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), "Administrador", email, hash, "ADMIN");

  console.log(`[db] Usuário administrador padrão criado: ${email} / senha: ${senha}`);
  console.log("[db] IMPORTANTE: crie novos usuários e troque essa senha assim que possível.");
}

// Evita reabrir o arquivo do banco a cada hot-reload em desenvolvimento.
const globalForDb = globalThis as unknown as { __churchDb?: Database.Database };

export const db = globalForDb.__churchDb ?? abrirBanco();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__churchDb = db;
}

export function novoId(): string {
  return crypto.randomUUID();
}
