function doPost(e) {
  Logger.log("Received POST: " + JSON.stringify(e));

  let interaction;
  try {
    interaction = JSON.parse(e.postData.contents);
  } catch (err) {
    const errorResponse = {
      type: 4,
      data: {
        content: "リクエストの解析に失敗しました。"
      }
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (interaction.type === 1) {
    return ContentService.createTextOutput(JSON.stringify({ type: 1 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (interaction.type === 2) {
    const commandName = interaction.data.name;
    const userId = interaction.member.user.id;

    if (commandName === "gem") {
      return handleGemCommand(interaction, userId);
    } else if (commandName === "con") {
      return handleConCommand(interaction, userId);
    } else if (commandName === "end") {
      return handleEndCommand(userId);
    }
  }

  const fallbackResponse = {
    type: 4,
    data: {
      content: "未対応のリクエストタイプです。"
    }
  };
  return ContentService.createTextOutput(JSON.stringify(fallbackResponse))
    .setMimeType(ContentService.MimeType.JSON);
}