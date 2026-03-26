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
      agenda: {
        Row: {
          created_at: string | null
          data: string
          id: string
          observacoes: string | null
          responsavel: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          observacoes?: string | null
          responsavel: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          responsavel?: string
          tipo?: string
        }
        Relationships: []
      }
      alertas: {
        Row: {
          created_at: string | null
          data: string
          id: string
          mensagem: string
          responsavel: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          mensagem: string
          responsavel: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          mensagem?: string
          responsavel?: string
          status?: string | null
        }
        Relationships: []
      }
      bonificacoes: {
        Row: {
          campanha: string | null
          created_at: string | null
          id: string
          marca: string
          nota_fiscal: string | null
          status: string | null
          tipo: string
          valor: number | null
        }
        Insert: {
          campanha?: string | null
          created_at?: string | null
          id?: string
          marca: string
          nota_fiscal?: string | null
          status?: string | null
          tipo: string
          valor?: number | null
        }
        Update: {
          campanha?: string | null
          created_at?: string | null
          id?: string
          marca?: string
          nota_fiscal?: string | null
          status?: string | null
          tipo?: string
          valor?: number | null
        }
        Relationships: []
      }
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
      promocoes: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          lojas: string[]
          nome: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          lojas: string[]
          nome: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          lojas?: string[]
          nome?: string
          status?: string | null
        }
        Relationships: []
      }
      promocoes_arquivos: {
        Row: {
          created_at: string | null
          id: string
          nome_arquivo: string
          promocao_id: string | null
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_arquivo: string
          promocao_id?: string | null
          tipo: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          promocao_id?: string | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_arquivos_promocao_id_fkey"
            columns: ["promocao_id"]
            isOneToOne: false
            referencedRelation: "promocoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          created_at: string | null
          id: string
          item: string
          loja: string
          observacao: string | null
          quantidade: number
          quantidade_enviada: number | null
          responsavel: string | null
          status: string | null
          tamanho: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item: string
          loja: string
          observacao?: string | null
          quantidade: number
          quantidade_enviada?: number | null
          responsavel?: string | null
          status?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item?: string
          loja?: string
          observacao?: string | null
          quantidade?: number
          quantidade_enviada?: number | null
          responsavel?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
