import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ImportacaoVendas from "@/components/vendas/ImportacaoVendas";
import DashboardVendasView from "@/components/vendas/DashboardVendasView";

export default function DashboardVendas() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard de Vendas</h1>
        <p className="text-sm text-muted-foreground">Importe relatórios e analise o desempenho de vendas por loja, departamento e período.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="importacao">Importação</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <DashboardVendasView />
        </TabsContent>
        <TabsContent value="importacao" className="mt-4">
          <ImportacaoVendas />
        </TabsContent>
      </Tabs>
    </div>
  );
}