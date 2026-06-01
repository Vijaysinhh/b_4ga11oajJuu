// Type definitions for Supabase tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: number;
          owner_name: string;
          shop_name: string;
          address: string | null;
          phone_number: string;
          password: string;
          is_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          owner_name: string;
          shop_name: string;
          address?: string | null;
          phone_number: string;
          password: string;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          owner_name?: string;
          shop_name?: string;
          address?: string | null;
          phone_number?: string;
          password?: string;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: number;
          shop_id: number | null;
          username: string;
          password: string;
          role: 'super_admin' | 'owner' | 'worker';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id?: number | null;
          username: string;
          password: string;
          role: 'super_admin' | 'owner' | 'worker';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number | null;
          username?: string;
          password?: string;
          role?: 'super_admin' | 'owner' | 'worker';
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: number;
          shop_id: number;
          name: string;
          name_marathi: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          name: string;
          name_marathi?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          name?: string;
          name_marathi?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      units: {
        Row: {
          id: number;
          shop_id: number;
          name: string;
          name_marathi: string | null;
          short_form: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          name: string;
          name_marathi?: string | null;
          short_form: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          name?: string;
          name_marathi?: string | null;
          short_form?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: number;
          shop_id: number;
          name: string;
          name_marathi: string | null;
          category_id: number | null;
          unit_id: number | null;
          quantity: number;
          buy_price: number;
          sell_price: number;
          margin_amount: number | null;
          margin_percent: number | null;
          low_stock_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          name: string;
          name_marathi?: string | null;
          category_id?: number | null;
          unit_id?: number | null;
          quantity?: number;
          buy_price: number;
          sell_price: number;
          margin_amount?: number | null;
          margin_percent?: number | null;
          low_stock_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          name?: string;
          name_marathi?: string | null;
          category_id?: number | null;
          unit_id?: number | null;
          quantity?: number;
          buy_price?: number;
          sell_price?: number;
          margin_amount?: number | null;
          margin_percent?: number | null;
          low_stock_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      price_tiers: {
        Row: {
          id: number;
          shop_id: number;
          item_id: number;
          quantity: number;
          unit_id: number | null;
          price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          item_id: number;
          quantity: number;
          unit_id?: number | null;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          item_id?: number;
          quantity?: number;
          unit_id?: number | null;
          price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: number;
          shop_id: number;
          date: string;
          timestamp: string;
          total_quantity_items: number | null;
          subtotal: number;
          total_cost: number;
          total_profit: number;
          profit_margin_percent: number | null;
          payment_method: 'cash' | 'card' | 'partial' | 'udhar';
          credit_customer_id: number | null;
          credit_customer_name: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          date: string;
          timestamp: string;
          total_quantity_items?: number | null;
          subtotal: number;
          total_cost: number;
          total_profit: number;
          profit_margin_percent?: number | null;
          payment_method: 'cash' | 'card' | 'partial' | 'udhar';
          credit_customer_id?: number | null;
          credit_customer_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          date?: string;
          timestamp?: string;
          total_quantity_items?: number | null;
          subtotal?: number;
          total_cost?: number;
          total_profit?: number;
          profit_margin_percent?: number | null;
          payment_method?: 'cash' | 'card' | 'partial' | 'udhar';
          credit_customer_id?: number | null;
          credit_customer_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: number;
          shop_id: number;
          sale_id: number;
          item_id: number | null;
          item_name: string;
          quantity: number;
          unit_id: number | null;
          unit_short_form: string | null;
          price_tier_id: number | null;
          price_per_unit: number;
          total_price: number;
          cost_per_unit: number;
          total_cost: number;
          profit: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          sale_id: number;
          item_id?: number | null;
          item_name: string;
          quantity: number;
          unit_id?: number | null;
          unit_short_form?: string | null;
          price_tier_id?: number | null;
          price_per_unit: number;
          total_price: number;
          cost_per_unit: number;
          total_cost: number;
          profit: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          sale_id?: number;
          item_id?: number | null;
          item_name?: string;
          quantity?: number;
          unit_id?: number | null;
          unit_short_form?: string | null;
          price_tier_id?: number | null;
          price_per_unit?: number;
          total_price?: number;
          cost_per_unit?: number;
          total_cost?: number;
          profit?: number;
          created_at?: string;
        };
      };
      stock_history: {
        Row: {
          id: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'expiry';
          quantity_changed: number;
          quantity_before: number;
          quantity_after: number;
          reason: string | null;
          cost_per_unit: number | null;
          reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'expiry';
          quantity_changed: number;
          quantity_before: number;
          quantity_after: number;
          reason?: string | null;
          cost_per_unit?: number | null;
          reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          item_id?: number;
          item_name?: string;
          type?: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'expiry';
          quantity_changed?: number;
          quantity_before?: number;
          quantity_after?: number;
          reason?: string | null;
          cost_per_unit?: number | null;
          reference?: string | null;
          created_at?: string;
        };
      };
      batches: {
        Row: {
          id: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          batch_number: string | null;
          purchase_date: string;
          expiry_date: string | null;
          quantity_received: number;
          quantity_sold: number;
          quantity_available: number;
          cost_per_unit: number;
          supplier_id: string | null;
          status: 'active' | 'expiring' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          batch_number?: string | null;
          purchase_date: string;
          expiry_date?: string | null;
          quantity_received: number;
          quantity_sold?: number;
          quantity_available: number;
          cost_per_unit: number;
          supplier_id?: string | null;
          status: 'active' | 'expiring' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          item_id?: number;
          item_name?: string;
          batch_number?: string | null;
          purchase_date?: string;
          expiry_date?: string | null;
          quantity_received?: number;
          quantity_sold?: number;
          quantity_available?: number;
          cost_per_unit?: number;
          supplier_id?: string | null;
          status?: 'active' | 'expiring' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
      };
      alerts: {
        Row: {
          id: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          alert_type: 'low_stock' | 'expiring' | 'slow_moving' | 'expired';
          message: string;
          severity: 'info' | 'warning' | 'critical';
          data: Json;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          item_id: number;
          item_name: string;
          alert_type: 'low_stock' | 'expiring' | 'slow_moving' | 'expired';
          message: string;
          severity: 'info' | 'warning' | 'critical';
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          item_id?: number;
          item_name?: string;
          alert_type?: 'low_stock' | 'expiring' | 'slow_moving' | 'expired';
          message?: string;
          severity?: 'info' | 'warning' | 'critical';
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
      };
      credit_customers: {
        Row: {
          id: number;
          shop_id: number;
          name: string;
          phone: string | null;
          balance: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          name: string;
          phone?: string | null;
          balance?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          name?: string;
          phone?: string | null;
          balance?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_entries: {
        Row: {
          id: number;
          shop_id: number;
          customer_id: number;
          customer_name: string;
          type: 'credit' | 'payment';
          amount: number;
          note: string | null;
          sale_id: number | null;
          bill_items: Json;
          date: string;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          customer_id: number;
          customer_name: string;
          type: 'credit' | 'payment';
          amount: number;
          note?: string | null;
          sale_id?: number | null;
          bill_items?: Json;
          date: string;
          timestamp: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          customer_id?: number;
          customer_name?: string;
          type?: 'credit' | 'payment';
          amount?: number;
          note?: string | null;
          sale_id?: number | null;
          bill_items?: Json;
          date?: string;
          timestamp?: string;
          created_at?: string;
        };
      };
      app_settings: {
        Row: {
          id: number;
          shop_id: number;
          language: 'en' | 'mr';
          theme: 'light' | 'dark' | 'system';
          setup_complete: boolean;
          last_backup: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_id: number;
          language?: 'en' | 'mr';
          theme?: 'light' | 'dark' | 'system';
          setup_complete?: boolean;
          last_backup?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          language?: 'en' | 'mr';
          theme?: 'light' | 'dark' | 'system';
          setup_complete?: boolean;
          last_backup?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
