// === 概要 ===
// Google Apps Script (GAS) + Glitch + Gemini API を使って、Discord Bot を構築する手順とコード

// ==========================
// ■ 全体構成
// ==========================
// 1. Discord Bot → スラッシュコマンドを実行
// 2. Discord → Glitch に Webhook POST
// 3. Glitch → GAS の Web API にリクエストを送信
// 4. GAS → Gemini API で処理して返す
// 5. Glitch → Discord に埋め込み形式でレスポンス返す

// ==========================
// ■ 準備物
// ==========================
// - Discord Bot Token
// - Glitch アカウント
// - Google Apps Script プロジェクト（Gemini API 利用）
// - Google Cloud 上の Gemini API の API Key

// ==========================
// ■ Discord のスラッシュコマンド設定
// ==========================
// コマンド: /gem [message]
// コマンド: /con [message]
// コマンド: /end

// ==========================
// ■ その他の注意点
// ==========================
// - Glitch 側を HTTPS にして Discord に登録
// - GAS 側のデプロイは Web App として公開設定にする（誰でもアクセス可）
// - GAS のセッション保持は簡易的（本番ではFirebase等推奨）