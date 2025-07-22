export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      asset_metadata: {
        Row: {
          id: string
          ticker: string
          nome: string
          tipo: 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO'
          pais: 'BRASIL' | 'EUA' | 'GLOBAL'
          moeda: 'BRL' | 'USD'
          setor: string | null
          subsetor: string | null
          segmento: string | null
          liquidez: string | null
          categoria_dy: string | null
          benchmark: string | null
          isin: string | null
          cnpj: string | null
          gestora: string | null
          descricao: string | null
          site_oficial: string | null
          cor_tema: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticker: string
          nome: string
          tipo: 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO'
          pais?: 'BRASIL' | 'EUA' | 'GLOBAL'
          moeda?: 'BRL' | 'USD'
          setor?: string | null
          subsetor?: string | null
          segmento?: string | null
          liquidez?: string | null
          categoria_dy?: string | null
          benchmark?: string | null
          isin?: string | null
          cnpj?: string | null
          gestora?: string | null
          descricao?: string | null
          site_oficial?: string | null
          cor_tema?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticker?: string
          nome?: string
          tipo?: 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO'
          pais?: 'BRASIL' | 'EUA' | 'GLOBAL'
          moeda?: 'BRL' | 'USD'
          setor?: string | null
          subsetor?: string | null
          segmento?: string | null
          liquidez?: string | null
          categoria_dy?: string | null
          benchmark?: string | null
          isin?: string | null
          cnpj?: string | null
          gestora?: string | null
          descricao?: string | null
          site_oficial?: string | null
          cor_tema?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          ticker: string
          date: string
          compra: number | null
          venda: number | null
          valor_unit: number | null
          dividendos: number | null
          juros: number | null
          observacoes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          date: string
          compra?: number | null
          venda?: number | null
          valor_unit?: number | null
          dividendos?: number | null
          juros?: number | null
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          date?: string
          compra?: number | null
          venda?: number | null
          valor_unit?: number | null
          dividendos?: number | null
          juros?: number | null
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}