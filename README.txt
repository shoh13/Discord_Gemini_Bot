# Discord Gemini Bot 構築手順

## 必要な構成

- Discord Bot（スラッシュコマンド登録）
- Glitch（Webhook サーバー）
- Google Apps Script（Gemini API 呼び出し）
- Gemini API Key（Google Cloud Console）

## ファイル構成

- server.js: Glitch のサーバーコード
- package.json: Glitch 用依存関係
- gas_code.gs: GAS 側コード
- slash_commands.json: スラッシュコマンド定義

## 手順概要

1. Discord Developer Portal で Bot を作成し、スラッシュコマンドを登録
2. Glitch で Express サーバーを構築（このプロジェクトを利用）
3. Google Apps Script を作成・デプロイ（Web App として公開）
4. Gemini API Key を GAS に設定
5. Webhook エンドポイントを Discord Bot に設定
