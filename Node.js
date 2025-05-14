const fetch = require("node-fetch");

const APPLICATION_ID = "YOUR_APP_ID";
const BOT_TOKEN = "YOUR_BOT_TOKEN";

const commands = [/* 上記の JSON を配列に入れる */];

async function registerCommands() {
  const res = await fetch(`https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands)
  });

  if (res.ok) {
    console.log("✅ コマンド登録完了");
  } else {
    const error = await res.text();
    console.error("❌ 登録失敗:", error);
  }
}

registerCommands();
