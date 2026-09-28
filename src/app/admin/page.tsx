import { redirect } from "next/navigation";

// A área de Administração usa a mesma tela de "Salas", com permissões extras
// liberadas automaticamente para quem faz login como Administração.
export default function AdminRedirectPage() {
  redirect("/salas");
}
