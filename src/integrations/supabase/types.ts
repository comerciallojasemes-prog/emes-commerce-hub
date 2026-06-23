export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      defeitos: {
        Row: {
          avaliado_por: string | null
          codigo_produto: string | null
          created_at: string | null
          data_avaliacao: string
          data_avaliacao_comercial: string | null
          data_compra: string
          data_venda: string | null
          ficha_cliente: string | null
          id: string
          loja: string
          motivo_defeito: string
          nome_cliente: string | null
          nome_responsavel: string
          numero_venda: string | null
          observacao_comercial: string | null
          referencia_produto: string
          responsavel_envio: string
          status: string | null
          telefone: string | null
          tipo: string
          tipo_produto: string
          updated_at: string | null
        }
        Insert: {
          avaliado_por?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          data_avaliacao: string
          data_avaliacao_comercial?: string | null
          data_compra: string
          data_venda?: string | null
          ficha_cliente?: string | null
          id?: string
          loja: string
          motivo_defeito: string
          nome_cliente?: string | null
          nome_responsavel: string
          numero_venda?: string | null
          observacao_comercial?: string | null
          referencia_produto: string
          responsavel_envio: string
          status?: string | null
          telefone?: string | null
          tipo: string
          tipo_produto: string
          updated_at?: string | null
        }
        Update: {
          avaliado_por?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          data_avaliacao?: string
          data_avaliacao_comercial?: string | null
          data_compra?: string
          data_venda?: string | null
          ficha_cliente?: string | null
          id?: string
          loja?: string
          motivo_defeito?: string
          nome_cliente?: string | null
          nome_responsavel?: string
          numero_venda?: string | null
          observacao_comercial?: string | null
          referencia_produto?: string
          responsavel_envio?: string
          status?: string | null
          telefone?: string | null
          tipo?: string
          tipo_produto?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      defeitos_arquivos: {
        Row: {
          created_at: string | null
          defeito_id: string | null
          id: string
          nome_arquivo: string
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          defeito_id?: string | null
          id?: string
          nome_arquivo: string
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          defeito_id?: string | null
          id?: string
          nome_arquivo?: string
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "defeitos_arquivos_defeito_id_fkey"
            columns: ["defeito_id"]
            isOneToOne: false
            referencedRelation: "defeitos"
            referencedColumns: ["id"]
          },
        ]
      }
      defeitos_relogios: {
        Row: {
          created_at: string | null
          defeito: string
          entrada_na_loja: string
          enviado_autorizada: string | null
          ficha: string
          finalizado: string | null
          id: string
          loja: string
          marca: string
          nome_cliente: string
          operador: string | null
          referencia: string
          retornou_loja: string | null
          status: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          defeito: string
          entrada_na_loja: string
          enviado_autorizada?: string | null
          ficha: string
          finalizado?: string | null
          id?: string
          loja: string
          marca: string
          nome_cliente: string
          operador?: string | null
          referencia: string
          retornou_loja?: string | null
          status?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          defeito?: string
          entrada_na_loja?: string
          enviado_autorizada?: string | null
          ficha?: string
          finalizado?: string | null
          id?: string
          loja?: string
          marca?: string
          nome_cliente?: string
          operador?: string | null
          referencia?: string
          retornou_loja?: string | null
          status?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      escala: {
        Row: {
          ano: number
          colaborador: string
          created_at: string | null
          dia: number
          folga: boolean | null
          id: string
          mes: number
          turno: string | null
        }
        Insert: {
          ano: number
          colaborador: string
          created_at?: string | null
          dia: number
          folga?: boolean | null
          id?: string
          mes: number
          turno?: string | null
        }
        Update: {
          ano?: number
          colaborador?: string
          created_at?: string | null
          dia?: number
          folga?: boolean | null
          id?: string
          mes?: number
          turno?: string | null
        }
        Relationships: []
      }
      escala_mensal: {
        Row: {
          ano: number
          colaborador: string
          created_at: string | null
          horario_fixo: string | null
          horario_quinzenal_1: string | null
          horario_quinzenal_2: string | null
          horario_semanal: string | null
          id: string
          mes: number
          tipo_escala: string
        }
        Insert: {
          ano: number
          colaborador: string
          created_at?: string | null
          horario_fixo?: string | null
          horario_quinzenal_1?: string | null
          horario_quinzenal_2?: string | null
          horario_semanal?: string | null
          id?: string
          mes: number
          tipo_escala?: string
        }
        Update: {
          ano?: number
          colaborador?: string
          created_at?: string | null
          horario_fixo?: string | null
          horario_quinzenal_1?: string | null
          horario_quinzenal_2?: string | null
          horario_semanal?: string | null
          id?: string
          mes?: number
          tipo_escala?: string
        }
        Relationships: []
      }
      escala_sabados: {
        Row: {
          ano: number
          created_at: string | null
          data: string
          extra: boolean | null
          id: string
          mes: number
          turno_10_14: string | null
          turno_14_19: string | null
          turno_8_12: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          data: string
          extra?: boolean | null
          id?: string
          mes: number
          turno_10_14?: string | null
          turno_14_19?: string | null
          turno_8_12?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          data?: string
          extra?: boolean | null
          id?: string
          mes?: number
          turno_10_14?: string | null
          turno_14_19?: string | null
          turno_8_12?: string | null
        }
        Relationships: []
      }
      pendencias: {
        Row: {
          contato: string | null
          created_at: string | null
          data: string
          id: string
          marca: string
          observacao: string
          responsavel: string
          status: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string | null
          data: string
          id?: string
          marca: string
          observacao: string
          responsavel: string
          status?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string | null
          data?: string
          id?: string
          marca?: string
          observacao?: string
          responsavel?: string
          status?: string | null
        }
        Relationships: []
      }
      perfis: {
        Row: {
          created_at: string | null
          email: string
          id: string
          loja: string | null
          nome: string
          perfil: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          loja?: string | null
          nome: string
          perfil: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          loja?: string | null
          nome?: string
          perfil?: string
          status?: string | null
        }
        Relationships: []
      }
      ponto_lanche: {
        Row: {
          colaborador_id: string
          colaborador_nome: string
          created_at: string | null
          data: string
          duracao_minutos: number | null
          editado_por: string | null
          id: string
          pausa: string
          retorno: string | null
          saida: string | null
          status: string | null
        }
        Insert: {
          colaborador_id: string
          colaborador_nome: string
          created_at?: string | null
          data?: string
          duracao_minutos?: number | null
          editado_por?: string | null
          id?: string
          pausa: string
          retorno?: string | null
          saida?: string | null
          status?: string | null
        }
        Update: {
          colaborador_id?: string
          colaborador_nome?: string
          created_at?: string | null
          data?: string
          duracao_minutos?: number | null
          editado_por?: string | null
          id?: string
          pausa?: string
          retorno?: string | null
          saida?: string | null
          status?: string | null
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          created_at: string | null
          data_envio: string | null
          id: string
          item: string
          loja: string
          observacao: string | null
          quantidade: number
          quantidade_enviada: number | null
          responsavel: string | null
          responsavel_envio: string | null
          status: string | null
          tamanho: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_envio?: string | null
          id?: string
          item: string
          loja: string
          observacao?: string | null
          quantidade: number
          quantidade_enviada?: number | null
          responsavel?: string | null
          responsavel_envio?: string | null
          status?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_envio?: string | null
          id?: string
          item?: string
          loja?: string
          observacao?: string | null
          quantidade?: number
          quantidade_enviada?: number | null
          responsavel?: string | null
          responsavel_envio?: string | null
          status?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suprimentos_deposito: {
        Row: {
          created_at: string | null
          estoque_minimo: number
          id: string
          observacao: string | null
          produto: string
          quantidade: number
          tamanho: string | null
        }
        Insert: {
          created_at?: string | null
          estoque_minimo?: number
          id?: string
          observacao?: string | null
          produto: string
          quantidade?: number
          tamanho?: string | null
        }
        Update: {
          created_at?: string | null
          estoque_minimo?: number
          id?: string
          observacao?: string | null
          produto?: string
          quantidade?: number
          tamanho?: string | null
        }
        Relationships: []
      }
      suprimentos_lojas: {
        Row: {
          id: string
          loja: string
          produto: string
          quantidade: number
          tamanho: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          loja: string
          produto: string
          quantidade?: number
          tamanho?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          loja?: string
          produto?: string
          quantidade?: number
          tamanho?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendas_departamento: {
        Row: {
          codigo: string
          created_at: string
          departamento: string
          id: string
          importacao_id: string
          loja: string
          lucro: number
          preco_custo_real: number
          preco_venda: number
          quantidade: number
          tipo: string
        }
        Insert: {
          codigo: string
          created_at?: string
          departamento: string
          id?: string
          importacao_id: string
          loja: string
          lucro?: number
          preco_custo_real?: number
          preco_venda?: number
          quantidade?: number
          tipo: string
        }
        Update: {
          codigo?: string
          created_at?: string
          departamento?: string
          id?: string
          importacao_id?: string
          loja?: string
          lucro?: number
          preco_custo_real?: number
          preco_venda?: number
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_departamento_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "vendas_importadas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_importadas: {
        Row: {
          ano: number
          created_at: string
          data_importacao: string
          id: string
          importado_por: string
          mes: number
          periodo: string
        }
        Insert: {
          ano: number
          created_at?: string
          data_importacao?: string
          id?: string
          importado_por: string
          mes: number
          periodo: string
        }
        Update: {
          ano?: number
          created_at?: string
          data_importacao?: string
          id?: string
          importado_por?: string
          mes?: number
          periodo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_andreia: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_comercial: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
