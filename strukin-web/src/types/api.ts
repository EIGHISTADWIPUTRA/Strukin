/** Types matching strukin-backend API responses */

export interface CategoryOut {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface TransactionOut {
  id: string;
  user_id: string;
  category_id: string | null;
  merchant_name: string | null;
  amount: number | null;
  transaction_date: string | null;
  image_path: string | null;
  raw_ai_output: Record<string, unknown> | null;
  created_at: string | null;
}

export interface PaginatedTransactions {
  page: number;
  size: number;
  total: number;
  items: TransactionOut[];
}

export interface AIExtractedData {
  merchant: string | null;
  total_amount: number | null;
  date: string | null;
  items: Array<Record<string, unknown>>;
  suggested_category: string | null;
}

export interface OCRResponse {
  transaction_id: string;
  extracted: AIExtractedData;
  category_matched: CategoryOut | null;
  message?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  monthly_budget: number | null;
  updated_at: string | null;
}
