// ==========================
// ■ Glitch 側コード（server.js）
// ==========================
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const app = express();
app.use(bodyParser.json());

// GAS の Web App URL
const GAS_ENDPOINT = "https://script.google.com/macros/s/___YOUR_SCRIPT_ID___/exec";

app.post("/interact", async (req, res) => {
  const { type, data, member, token, id } = req.body;

  if (type === 1) {
    return res.json({ type: 1 }); // PING 対応
  }

  const command = data.name;
  const userId = member.user.id;
  const input = data.options?.[0]?.value || "";

  const payload = {
    command,
    userId,
    input
  };

  const gasRes = await fetch(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await gasRes.json();

  const embed = {
    type: 4,
    data: {
      embeds: [
        {
          title: json.title,
          description: json.message,
          color: 5814783
        }
      ]
    }
  };

  res.json(embed);
});

app.listen(3000, () => console.log("Bot is running on port 3000"));