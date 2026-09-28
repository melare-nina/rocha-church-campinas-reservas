import { auth } from "@/lib/auth";
import { listarSalas, serializarSala } from "@/lib/reservations";
import RoomList from "@/components/RoomList";

export default async function SalasPage() {
  const session = await auth();
  const rooms = listarSalas().map(serializarSala);
  const podeEditar = session?.user?.role === "ADMIN";

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Salas</h1>
      <p className="mb-6 text-sm text-slate-500">
        {podeEditar
          ? "Você está logado como Administração: pode consultar, editar e cancelar qualquer reserva."
          : "Você está logado como Líder: consulta das reservas por sala, com filtros."}
      </p>
      <RoomList rooms={rooms} podeEditar={podeEditar} />
    </div>
  );
}
