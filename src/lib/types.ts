export interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  visible: boolean;
}

export interface Settings {
  id?: string;
  system_prompt: string;
  temperature: number;
  context_rounds: number;
  compress_threshold: number;
  compress_keep_rounds: number;
  max_reply_tokens: number;
  boyfriend_name: string;
}
