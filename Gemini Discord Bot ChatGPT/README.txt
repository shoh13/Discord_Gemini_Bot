【Discord × Gemini GAS Bot - 概要と手順】

このプロジェクトは、Google Apps Script（GAS）を使って Discord Bot と Gemini API を連携し、
Discord上でスラッシュコマンドを使って会話できるボットを構築するための一式です。

---

【1. 使用するスラッシュコマンド】

/gem message:<テキスト>
  - 新しい会話セッションを開始（ユーザー単位）
  - 指定したメッセージをGeminiに送信し、回答をEmbed形式で返す

/con message:<テキスト>
  - 現在の会話セッションを継続
  - 履歴を保持しつつ、Geminiに問い合わせ

/end
  - 会話セッションを終了（履歴破棄）

---

【2. GAS 側の構成】

- doPost 関数で Discord からの POST を受信
- type:1（PING） に対し type:1 の JSON を返し、エンドポイント確認を通す
- CacheService を使用して userId ごとのセッション履歴を一時保存（最大1時間）
- Gemini API (generativelanguage.googleapis.com) に履歴を元に問い合わせ
- 長文は分割して Discord Embed で返答

---

【3. Discord側の準備手順】

① Discord Developer Portal で Bot を作成し、TOKEN / APPLICATION_ID を取得  
② Bot をサーバーに招待（スコープ: bot + applications.commands）  
③ GASを全員公開でデプロイし、そのURLを「Interactions Endpoint URL」に登録  
④ スラッシュコマンド（/gem /con /end）を Node.js スクリプトで登録  

---

【4. Node.js コマンド登録スクリプト構成】

- index.js：コマンド登録スクリプト
- commands.json：3つのコマンド定義
- .env：ボットのトークン、アプリケーションID、サーバーIDを設定

---

【5. 使用方法】

npm install dotenv discord.js
node index.js

---