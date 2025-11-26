# Supabase Edge Functions セットアップガイド

## 概要

Gemini APIキーをクライアントから隠蔽するため、Supabase Edge Functionsをプロキシとして使用します。

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. https://supabase.com にアクセス
2. 新規プロジェクトを作成
3. プロジェクトURL とサービスロールキーをメモ

### 2. Supabase CLIのインストール

```bash
npm install -g supabase
```

### 3. ローカル環境の初期化

```bash
supabase login
supabase init
```

### 4. Edge Functionの作成

```bash
supabase functions new gemini-proxy
```

### 5. Edge Function実装

`supabase/functions/gemini-proxy/index.ts` に以下を記述：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, bookTitle } = await req.json()

    // レート制限チェック（オプション）
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Unauthorized')
    }

    // Gemini API呼び出し
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

### 6. 環境変数の設定

```bash
# ローカル開発用
supabase secrets set GEMINI_API_KEY=your_api_key_here

# 本番環境用（Supabaseダッシュボードから設定）
```

### 7. デプロイ

```bash
supabase functions deploy gemini-proxy
```

### 8. クライアント側の実装

`app/core/services/aiAffiliate.ts` を以下のように変更：

```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export async function getBookRecommendations(
  bookTitle: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/gemini-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt: `参考書「${bookTitle}」を学習した後に読むべき関連書籍を3冊提案してください。`,
          bookTitle,
        }),
      }
    )

    const data = await response.json()
    // レスポンスをパース
    return parseRecommendations(data)
  } catch (error) {
    console.error('Failed to get recommendations:', error)
    return []
  }
}
```

## 環境変数の設定

`.env` ファイルに追加：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## メリット

- ✅ APIキーがクライアントに露出しない
- ✅ レート制限をサーバー側で管理可能
- ✅ ユーザー認証と統合可能
- ✅ 無料枠でも十分使える（月200万リクエスト）
- ✅ デプロイが簡単

## 注意事項

- Supabase Edge Functionsは毎月500,000リクエストまで無料
- それ以降は$2 per 100,000リクエスト
- Gemini APIの料金は別途発生
