import HomeTabs from "@/components/HomeTabs";

export default function HomePage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Reserva de salas da igreja</h1>
      <p className="mb-6 text-sm text-slate-500">
        Converse com o assistente para reservar uma sala, ou consulte o calendário de reservas. Não é
        necessário fazer login.
      </p>
      <HomeTabs />
    </div>
  );
}
