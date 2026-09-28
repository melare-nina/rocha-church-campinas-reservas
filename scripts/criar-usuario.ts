/**
 * Script para criar (ou atualizar a senha de) um usuário Líder ou Administração.
 *
 * Uso:
 *   npx tsx scripts/criar-usuario.ts "Nome Completo" email@igreja.org senha123 LIDER
 *   npx tsx scripts/criar-usuario.ts "Nome Completo" email@igreja.org senha123 ADMIN
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "../src/lib/db";

const [, , nome, email, senha, papel] = process.argv;

if (!nome || !email || !senha || !papel || !["LIDER", "ADMIN"].includes(papel)) {
  console.error(
    'Uso: npx tsx scripts/criar-usuario.ts "Nome Completo" email@igreja.org senha123 LIDER|ADMIN'
  );
  process.exit(1);
}

const emailNormalizado = email.trim().toLowerCase();
const hash = bcrypt.hashSync(senha, 10);

const existente = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNormalizado) as
  | { id: string }
  | undefined;

if (existente) {
  db.prepare("UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?").run(
    nome,
    hash,
    papel,
    existente.id
  );
  console.log(`Usuário atualizado: ${emailNormalizado} (${papel})`);
} else {
  db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
    crypto.randomUUID(),
    nome,
    emailNormalizado,
    hash,
    papel
  );
  console.log(`Usuário criado: ${emailNormalizado} (${papel})`);
}
