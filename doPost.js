// ==========================
// ■ GAS 側コード（doPost）
// ==========================
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const SESSIONS = {};

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const { command, userId, input } = data;

  if (command === "gem") {
    SESSIONS[userId] = ["ユーザー: " + input];
    const aiReply = callGemini(SESSIONS[userId].join("\n"));
    SESSIONS[userId].push("AI: " + aiReply);
    return ContentService.createTextOutput(JSON.stringify({
      title: "会話開始",
      message: aiReply
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (command === "con") {
    if (!SESSIONS[userId]) {
      return ContentService.createTextOutput(JSON.stringify({
        title: "エラー",
        message: "まず /gem で会話を開始してください。"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    SESSIONS[userId].push("ユーザー: " + input);
    const aiReply = callGemini(SESSIONS[userId].join("\n"));
    SESSIONS[userId].push("AI: " + aiReply);
    return ContentService.createTextOutput(JSON.stringify({
      title: "応答",
      message: aiReply
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (command === "end") {
    delete SESSIONS[userId];
    return ContentService.createTextOutput(JSON.stringify({
      title: "セッション終了",
      message: "会話を終了しました。"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function callGemini(prompt) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "（応答がありません）";
}