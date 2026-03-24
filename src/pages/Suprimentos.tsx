import { useAuth } from "@/contexts/AuthContext";
import SuprimentosDeposito from "@/components/suprimentos/SuprimentosDeposito";
import SuprimentosLoja from "@/components/suprimentos/SuprimentosLoja";

export default function Suprimentos() {
  const { perfil } = useAuth();

  if (perfil?.perfil === "Lojas") {
    return <SuprimentosLoja />;
  }

  return <SuprimentosDeposito />;
}
