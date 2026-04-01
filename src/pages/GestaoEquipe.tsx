import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EscalaTab from "@/components/equipe/EscalaTab";
import PontoLancheTab from "@/components/equipe/PontoLancheTab";

export default function GestaoEquipe() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
      <Tabs defaultValue="escala" className="w-full">
        <TabsList>
          <TabsTrigger value="escala">Escala</TabsTrigger>
          <TabsTrigger value="ponto">Ponto de Lanche</TabsTrigger>
        </TabsList>
        <TabsContent value="escala" className="mt-4">
          <EscalaTab />
        </TabsContent>
        <TabsContent value="ponto" className="mt-4">
          <PontoLancheTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
