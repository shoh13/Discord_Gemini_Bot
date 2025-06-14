/**
 * Discord-Gemini Bot - 統合版
 * Google Apps Script + Gemini API + Google Spreadsheet
 * 
 * 🚀 機能一覧:
 * - 基本AI対話（/gem, /end）
 * - 画像認識対応（5MB以下）
 * - ユーザー設定管理（/settings）
 * - 管理者機能（/admin-*）
 * - セキュリティ機能（レート制限、コンテンツフィルタ）
 * - 分析・監視機能
 * - UX向上機能（パーソナライゼーション、クイック返信）
 * - 自動アラート・メンテナンス
 */

// ==================== 設定管理 ====================

const CONFIG = {
  // 基本設定
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  DISCORD_BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('DISCORD_BOT_TOKEN'),
  DISCORD_APPLICATION_ID: PropertiesService.getScriptProperties().getProperty('DISCORD_APPLICATION_ID'),
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
  
  // AI設定
  GEMINI_MODEL: 'gemini-1.5-flash',
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  HISTORY_RETENTION_HOURS: 24,
  MAX_RESPONSE_LENGTH: 2000,
  
  // セキュリティ設定
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_HOUR: 200,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 50,
  CONTENT_FILTER_ENABLED: true,
  
  // UX設定
  PERSONALIZATION_ENABLED: true,
  QUICK_REPLIES_ENABLED: true,
  CONVERSATION_CONTEXT_ENABLED: true,
  MAX_CONTEXT_MESSAGES: 5,
  
  // 監視設定
  ERROR_RATE_THRESHOLD: 0.1,
  RESPONSE_TIME_THRESHOLD: 5000,
  ALERT_COOLDOWN_MINUTES: 30
};

// 管理者ID（カンマ区切りで設定）
const ADMIN_USER_IDS = (PropertiesService.getScriptProperties().getProperty('ADMIN_USER_IDS') || '').split(',').filter(id => id.trim());

// Discord定数
const DISCORD_INTERACTION_TYPES = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3, MODAL_SUBMIT: 5 };
const DISCORD_RESPONSE_TYPES = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4, UPDATE_MESSAGE: 7, MODAL: 9 };

// ==================== メイン処理 ====================

/**
 * Discord Webhookエンドポイント
 */
function doPost(e) {
  try {
    const interaction = JSON.parse(e.postData.contents);
    
    // Ping応答
    if (interaction.type === DISCORD_INTERACTION_TYPES.PING) {
      return ContentService.createTextOutput(JSON.stringify({ type: DISCORD_RESPONSE_TYPES.PONG }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // セキュリティチェック
    const securityResult = securityMiddleware(interaction);
    if (!securityResult.allowed) {
      return createErrorResponse(`アクセスが拒否されました: ${securityResult.reason}`);
    }
    
    // コマンド処理
    if (interaction.type === DISCORD_INTERACTION_TYPES.APPLICATION_COMMAND) {
      return handleSlashCommand(interaction);
    }
    
    // ボタン・モーダル処理
    if (interaction.type === DISCORD_INTERACTION_TYPES.MESSAGE_COMPONENT) {
      return handleInteractionComponent(interaction);
    }
    
    if (interaction.type === DISCORD_INTERACTION_TYPES.MODAL_SUBMIT) {
      return handleModalSubmit(interaction);
    }
    
    return createErrorResponse('サポートされていないインタラクションタイプです。');
    
  } catch (error) {
    console.error('doPost error:', error);
    recordError('WEBHOOK_ERROR', error.message, null, { stack: error.stack });
    return createErrorResponse('内部エラーが発生しました。');
  }
}

/**
 * Slash Commandの処理
 */
function handleSlashCommand(interaction) {
  const commandName = interaction.data.name;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  
  try {
    // メンテナンスモードチェック
    if (isMaintenanceMode() && !isAdmin(userId)) {
      return createErrorResponse('現在メンテナンス中です。しばらくお待ちください。');
    }
    
    switch (commandName) {
      case 'gem':
        return handleGemCommand(interaction);
      case 'end':
        return handleEndCommand(interaction);
      case 'settings':
        return handleSettingsCommand(interaction);
      case 'admin-status':
        return handleAdminStatusCommand(interaction);
      case 'admin-maintenance':
        return handleAdminMaintenanceCommand(interaction);
      case 'admin-cleanup':
        return handleAdminCleanupCommand(interaction);
      case 'quality-report':
        return handleQualityReportCommand(interaction);
      case 'analytics':
        return handleAnalyticsCommand(interaction);
      case 'security':
        return handleSecurityCommand(interaction);
      default:
        return createErrorResponse(`不明なコマンドです: ${commandName}`);
    }
  } catch (error) {
    console.error(`Command error (${commandName}):`, error);
    recordError('COMMAND_ERROR', error.message, userId, { command: commandName });
    return createErrorResponse(`コマンド処理中にエラーが発生しました: ${error.message}`);
  }
}

// ==================== AI対話機能 ====================

/**
 * /gem コマンドの処理
 */
function handleGemCommand(interaction) {
  const startTime = Date.now();
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const options = interaction.data.options || [];
  const questionOption = options.find(opt => opt.name === 'question');
  const imageOption = options.find(opt => opt.name === 'image');
  
  if (!questionOption?.value) {
    return createErrorResponse('質問内容を入力してください。');
  }
  
  const question = questionOption.value.trim();
  const conversationId = generateConversationId(userId);
  
  try {
    // 画像処理
    let imageData = null;
    if (imageOption && interaction.data.resolved?.attachments) {
      imageData = processImage(imageOption.value, interaction.data.resolved.attachments);
    }
    
    // ユーザー設定取得
    const userPreferences = getUserPreferences(userId);
    
    // 会話履歴取得
    const history = getUserHistory(userId);
    
    // コンテキスト付きプロンプト生成
    const contextualPrompt = buildContextualPrompt(question, conversationId, userPreferences, history);
    
    // Gemini API呼び出し
    const response = callGeminiAPI(contextualPrompt, imageData, history);
    
    // レスポンス処理
    let finalResponse = response;
    if (response.length > CONFIG.MAX_RESPONSE_LENGTH) {
      finalResponse = response.substring(0, CONFIG.MAX_RESPONSE_LENGTH - 50) + '\n\n...(応答が長すぎるため省略されました)';
    }
    
    // パーソナライゼーション適用
    finalResponse = applyPersonalization(finalResponse, userPreferences);
    
    // 履歴保存
    addToHistory(userId, question, response, !!imageData, conversationId);
    
    // パフォーマンス記録
    recordPerformance(Date.now() - startTime, 'SUCCESS');
    
    // 拡張レスポンス作成（フィードバック・クイック返信付き）
    return createEnhancedResponse(finalResponse, conversationId, userId, question);
    
  } catch (error) {
    console.error('Gem command error:', error);
    recordError('GEMINI_API_ERROR', error.message, userId, { question });
    recordPerformance(Date.now() - startTime, 'ERROR');
    return createErrorResponse(`Gemini APIエラー: ${error.message}`);
  }
}

/**
 * /end コマンドの処理
 */
function handleEndCommand(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  
  try {
    clearUserHistory(userId);
    return createSuccessResponse('✅ 会話セッションを終了しました。履歴がクリアされました。');
  } catch (error) {
    console.error('End command error:', error);
    return createErrorResponse('セッション終了中にエラーが発生しました。');
  }
}

// ==================== セキュリティ機能 ====================

/**
 * セキュリティミドルウェア
 */
function securityMiddleware(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  
  if (!userId) {
    return { allowed: false, reason: 'NO_USER_ID' };
  }
  
  // レート制限チェック
  const rateLimitResult = checkRateLimit(userId);
  if (!rateLimitResult.allowed) {
    recordSecurityEvent('RATE_LIMIT_EXCEEDED', userId, rateLimitResult.reason);
    return rateLimitResult;
  }
  
  // コンテンツフィルタリング
  if (interaction.data?.options) {
    for (const option of interaction.data.options) {
      if (option.type === 3 && option.value) { // STRING type
        const contentCheck = checkContent(option.value);
        if (!contentCheck.safe) {
          recordSecurityEvent('CONTENT_FILTER_VIOLATION', userId, contentCheck.issues);
          return { allowed: false, reason: 'CONTENT_VIOLATION', details: contentCheck.issues };
        }
      }
    }
  }
  
  return { allowed: true };
}

/**
 * レート制限チェック
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = getUserRequests(userId);
  
  // 1分間のリクエスト数チェック
  const oneMinuteAgo = now - (60 * 1000);
  const requestsInLastMinute = userRequests.filter(time => time > oneMinuteAgo);
  
  if (requestsInLastMinute.length >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, reason: 'RATE_LIMIT_MINUTE' };
  }
  
  // 1時間のリクエスト数チェック
  const oneHourAgo = now - (60 * 60 * 1000);
  const requestsInLastHour = userRequests.filter(time => time > oneHourAgo);
  
  if (requestsInLastHour.length >= CONFIG.MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, reason: 'RATE_LIMIT_HOUR' };
  }
  
  // リクエスト記録
  recordUserRequest(userId, now);
  
  return { allowed: true };
}

/**
 * コンテンツフィルタリング
 */
function checkContent(message) {
  if (!CONFIG.CONTENT_FILTER_ENABLED) {
    return { safe: true };
  }
  
  const issues = [];
  
  // スパムパターンチェック
  if (/(.)\1{10,}/.test(message)) {
    issues.push({ type: 'SPAM', pattern: 'repeated_characters' });
  }
  
  // 機密情報チェック
  if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(message)) {
    issues.push({ type: 'SENSITIVE_INFO', pattern: 'credit_card' });
  }
  
  // 長さチェック
  if (message.length > 4000) {
    issues.push({ type: 'TOO_LONG', length: message.length });
  }
  
  return {
    safe: issues.length === 0,
    issues: issues
  };
}

// ==================== UX向上機能 ====================

/**
 * ユーザー設定の取得
 */
function getUserPreferences(userId) {
  try {
    const sheet = getOrCreateSheet('UserPreferences', [
      ['UserId', 'Language', 'ResponseStyle', 'IncludeEmojis', 'DetailLevel', 'Topics', 'LastUpdated']
    ]);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === userId) {
        return {
          userId: row[0],
          language: row[1] || 'ja',
          responseStyle: row[2] || 'normal',
          includeEmojis: row[3] !== false,
          detailLevel: row[4] || 'medium',
          topics: row[5] ? JSON.parse(row[5]) : [],
          lastUpdated: new Date(row[6])
        };
      }
    }
    
    // デフォルト設定
    return {
      userId: userId,
      language: 'ja',
      responseStyle: 'normal',
      includeEmojis: true,
      detailLevel: 'medium',
      topics: [],
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { userId, language: 'ja', responseStyle: 'normal', includeEmojis: true, detailLevel: 'medium', topics: [] };
  }
}

/**
 * パーソナライゼーション適用
 */
function applyPersonalization(content, preferences) {
  if (!CONFIG.PERSONALIZATION_ENABLED) {
    return content;
  }
  
  let styledContent = content;
  
  // 絵文字の削除
  if (!preferences.includeEmojis) {
    styledContent = styledContent.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  }
  
  // 詳細レベルの調整
  if (preferences.detailLevel === 'brief') {
    const paragraphs = styledContent.split('\n\n');
    styledContent = paragraphs[0] + (paragraphs.length > 1 ? '\n\n...(詳細は省略)' : '');
  }
  
  return styledContent;
}

/**
 * コンテキスト付きプロンプト生成
 */
function buildContextualPrompt(question, conversationId, userPreferences, history) {
  if (!CONFIG.CONVERSATION_CONTEXT_ENABLED || history.length === 0) {
    return question;
  }
  
  let contextPrompt = '以下は過去の会話履歴です：\n\n';
  
  history.slice(-CONFIG.MAX_CONTEXT_MESSAGES).forEach((message, index) => {
    contextPrompt += `[${index + 1}] ユーザー: ${message.question}\n`;
    contextPrompt += `[${index + 1}] AI: ${message.response.substring(0, 200)}${message.response.length > 200 ? '...' : ''}\n\n`;
  });
  
  contextPrompt += `現在の質問: ${question}\n\n`;
  contextPrompt += '過去の会話を踏まえて、一貫性のある回答をしてください。';
  
  return contextPrompt;
}

/**
 * 拡張レスポンス作成（フィードバック・クイック返信付き）
 */
function createEnhancedResponse(content, conversationId, userId, originalQuestion) {
  try {
    const response = {
      type: DISCORD_RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: content,
        flags: 0,
        components: []
      }
    };
    
    // フィードバックボタン
    const feedbackRow = {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 3, // SUCCESS
          label: "👍 良い回答",
          custom_id: `feedback_good_${conversationId}`
        },
        {
          type: 2, // BUTTON
          style: 4, // DANGER
          label: "👎 改善が必要",
          custom_id: `feedback_bad_${conversationId}`
        },
        {
          type: 2, // BUTTON
          style: 1, // PRIMARY
          label: "📝 詳細評価",
          custom_id: `feedback_detail_${conversationId}`
        }
      ]
    };
    
    response.data.components.push(feedbackRow);
    
    // クイック返信ボタン
    if (CONFIG.QUICK_REPLIES_ENABLED) {
      const quickReplies = generateQuickReplies(originalQuestion);
      if (quickReplies.length > 0) {
        const quickReplyRow = {
          type: 1, // ACTION_ROW
          components: quickReplies.map(reply => ({
            type: 2, // BUTTON
            style: 2, // SECONDARY
            label: reply.label,
            custom_id: `quick_reply_${conversationId}_${Buffer.from(reply.value).toString('base64').substring(0, 50)}`
          }))
        };
        response.data.components.push(quickReplyRow);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error creating enhanced response:', error);
    return createSuccessResponse(content);
  }
}

/**
 * クイック返信生成
 */
function generateQuickReplies(question) {
  const lowerQuestion = question.toLowerCase();
  const quickReplies = [];
  
  if (lowerQuestion.includes('どうやって') || lowerQuestion.includes('方法')) {
    quickReplies.push(
      { label: '📝 詳しく教えて', value: 'より詳細な手順を教えてください' },
      { label: '🔍 関連情報', value: '関連する情報も教えてください' }
    );
  } else if (lowerQuestion.includes('とは') || lowerQuestion.includes('何ですか')) {
    quickReplies.push(
      { label: '📚 詳細説明', value: 'もっと詳しく説明してください' },
      { label: '🌟 具体例', value: '具体例を教えてください' }
    );
  } else {
    quickReplies.push(
      { label: '🔍 詳しく', value: 'もっと詳しく教えてください' },
      { label: '💡 例', value: '具体例を教えてください' }
    );
  }
  
  return quickReplies.slice(0, 2);
}

// ==================== 管理者機能 ====================

/**
 * 管理者権限チェック
 */
function isAdmin(userId) {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * メンテナンスモードチェック
 */
function isMaintenanceMode() {
  return PropertiesService.getScriptProperties().getProperty('MAINTENANCE_MODE') === 'true';
}

/**
 * /admin-status コマンド
 */
function handleAdminStatusCommand(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  
  if (!isAdmin(userId)) {
    return createErrorResponse('このコマンドは管理者のみ使用できます。');
  }
  
  try {
    const stats = getSystemStats();
    const message = `🔧 **システム状況**\n\n` +
      `**📊 基本統計**\n` +
      `• 総会話数: ${stats.totalConversations}件\n` +
      `• アクティブユーザー: ${stats.activeUsers}人\n` +
      `• 今日のリクエスト: ${stats.todayRequests}件\n` +
      `• エラー率: ${(stats.errorRate * 100).toFixed(1)}%\n\n` +
      `**🔧 システム状態**\n` +
      `• メンテナンスモード: ${isMaintenanceMode() ? '有効' : '無効'}\n` +
      `• データベースサイズ: ${stats.databaseSize}行\n` +
      `• 最終クリーンアップ: ${stats.lastCleanup}\n`;
    
    return createSuccessResponse(message);
  } catch (error) {
    console.error('Admin status error:', error);
    return createErrorResponse('システム状況の取得中にエラーが発生しました。');
  }
}

/**
 * /admin-maintenance コマンド
 */
function handleAdminMaintenanceCommand(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  
  if (!isAdmin(userId)) {
    return createErrorResponse('このコマンドは管理者のみ使用できます。');
  }
  
  try {
    const options = interaction.data.options || [];
    const enableOption = options.find(opt => opt.name === 'enable');
    const enable = enableOption ? enableOption.value : !isMaintenanceMode();
    
    PropertiesService.getScriptProperties().setProperty('MAINTENANCE_MODE', enable.toString());
    
    const message = enable ? 
      '🔧 メンテナンスモードを有効にしました。一般ユーザーのアクセスが制限されます。' :
      '✅ メンテナンスモードを無効にしました。通常運用に戻ります。';
    
    return createSuccessResponse(message);
  } catch (error) {
    console.error('Admin maintenance error:', error);
    return createErrorResponse('メンテナンスモードの切り替え中にエラーが発生しました。');
  }
}

// ==================== データ管理 ====================

/**
 * シートの取得または作成
 */
function getOrCreateSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    if (headers) {
      sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    }
  }
  
  return sheet;
}

/**
 * 会話履歴の取得
 */
function getUserHistory(userId) {
  try {
    const sheet = getOrCreateSheet('History', [
      ['ConversationId', 'Timestamp', 'Question', 'Response', 'HasImage', 'UserId']
    ]);
    const data = sheet.getDataRange().getValues();
    
    const history = [];
    const cutoffTime = new Date(Date.now() - CONFIG.HISTORY_RETENTION_HOURS * 60 * 60 * 1000);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[5] === userId && new Date(row[1]) > cutoffTime) {
        history.push({
          conversationId: row[0],
          timestamp: new Date(row[1]),
          question: row[2],
          response: row[3],
          hasImage: row[4]
        });
      }
    }
    
    return history.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

/**
 * 履歴への追加
 */
function addToHistory(userId, question, response, hasImage, conversationId) {
  try {
    const sheet = getOrCreateSheet('History', [
      ['ConversationId', 'Timestamp', 'Question', 'Response', 'HasImage', 'UserId']
    ]);
    
    sheet.appendRow([
      conversationId,
      new Date(),
      question,
      response,
      hasImage,
      userId
    ]);
  } catch (error) {
    console.error('Error adding to history:', error);
  }
}

/**
 * エラー記録
 */
function recordError(errorType, message, userId, details = {}) {
  try {
    const sheet = getOrCreateSheet('Errors', [
      ['Timestamp', 'ErrorType', 'Message', 'UserId', 'Details']
    ]);
    
    sheet.appendRow([
      new Date(),
      errorType,
      message,
      userId || 'SYSTEM',
      JSON.stringify(details)
    ]);
  } catch (error) {
    console.error('Error recording error:', error);
  }
}

/**
 * パフォーマンス記録
 */
function recordPerformance(responseTime, status, details = '') {
  try {
    const sheet = getOrCreateSheet('Performance', [
      ['Timestamp', 'ResponseTime', 'Status', 'Details']
    ]);
    
    sheet.appendRow([
      new Date(),
      responseTime,
      status,
      details
    ]);
  } catch (error) {
    console.error('Error recording performance:', error);
  }
}

/**
 * セキュリティイベント記録
 */
function recordSecurityEvent(eventType, userId, details) {
  try {
    const sheet = getOrCreateSheet('SecurityEvents', [
      ['Timestamp', 'EventType', 'UserId', 'Details', 'Source']
    ]);
    
    sheet.appendRow([
      new Date(),
      eventType,
      userId,
      JSON.stringify(details),
      'SYSTEM'
    ]);
  } catch (error) {
    console.error('Error recording security event:', error);
  }
}

// ==================== Gemini API ====================

/**
 * Gemini APIの呼び出し
 */
function callGeminiAPI(question, imageData, history) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  let contents = [];
  
  // 履歴の追加（最新5件まで）
  history.slice(-5).forEach(item => {
    contents.push({
      role: 'user',
      parts: [{ text: item.question }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: item.response }]
    });
  });
  
  // 現在の質問
  const currentParts = [{ text: question }];
  
  // 画像がある場合は追加
  if (imageData) {
    currentParts.push({
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.data
      }
    });
  }
  
  contents.push({
    role: 'user',
    parts: currentParts
  });
  
  const payload = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  });
  
  const responseData = JSON.parse(response.getContentText());
  
  if (responseData.error) {
    throw new Error(responseData.error.message);
  }
  
  if (!responseData.candidates || responseData.candidates.length === 0) {
    throw new Error('Geminiからの応答が取得できませんでした。');
  }
  
  return responseData.candidates[0].content.parts[0].text;
}

/**
 * 画像処理
 */
function processImage(attachmentId, attachments) {
  const attachment = attachments[attachmentId];
  
  if (!attachment) {
    throw new Error('添付ファイルが見つかりません。');
  }
  
  // ファイルサイズチェック
  if (attachment.size > CONFIG.MAX_IMAGE_SIZE) {
    throw new Error(`画像サイズが制限を超えています。(${Math.round(attachment.size / 1024 / 1024 * 100) / 100}MB > 5MB)`);
  }
  
  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(attachment.content_type)) {
    throw new Error(`サポートされていない画像形式です: ${attachment.content_type}`);
  }
  
  // 画像データの取得
  const response = UrlFetchApp.fetch(attachment.url);
  const blob = response.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  
  return {
    mimeType: attachment.content_type,
    data: base64Data
  };
}

// ==================== ユーティリティ ====================

/**
 * 会話ID生成
 */
function generateConversationId(userId) {
  return `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 成功レスポンス作成
 */
function createSuccessResponse(content) {
  return ContentService.createTextOutput(JSON.stringify({
    type: DISCORD_RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content,
      flags: 0
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーレスポンス作成
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    type: DISCORD_RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `❌ エラー: ${message}`,
      flags: 64 // EPHEMERAL
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * システム統計取得
 */
function getSystemStats() {
  try {
    const historySheet = getOrCreateSheet('History');
    const errorSheet = getOrCreateSheet('Errors');
    
    const historyData = historySheet.getDataRange().getValues();
    const errorData = errorSheet.getDataRange().getValues();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayRequests = 0;
    let totalConversations = historyData.length - 1;
    const activeUsers = new Set();
    
    for (let i = 1; i < historyData.length; i++) {
      const timestamp = new Date(historyData[i][1]);
      const userId = historyData[i][5];
      
      if (timestamp >= today) {
        todayRequests++;
      }
      
      if (userId) {
        activeUsers.add(userId);
      }
    }
    
    let todayErrors = 0;
    for (let i = 1; i < errorData.length; i++) {
      const timestamp = new Date(errorData[i][0]);
      if (timestamp >= today) {
        todayErrors++;
      }
    }
    
    const errorRate = todayRequests > 0 ? todayErrors / todayRequests : 0;
    
    return {
      totalConversations: totalConversations,
      activeUsers: activeUsers.size,
      todayRequests: todayRequests,
      errorRate: errorRate,
      databaseSize: totalConversations,
      lastCleanup: '未実装'
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      totalConversations: 0,
      activeUsers: 0,
      todayRequests: 0,
      errorRate: 0,
      databaseSize: 0,
      lastCleanup: 'エラー'
    };
  }
}

// ==================== 初期化・設定 ====================

/**
 * Slash Commandsの登録
 */
function registerSlashCommands() {
  const commands = [
    {
      name: 'gem',
      description: 'Geminiに質問する（画像も送信可能）',
      options: [
        {
          type: 3, // STRING
          name: 'question',
          description: '質問内容',
          required: true,
          max_length: 1000
        },
        {
          type: 11, // ATTACHMENT
          name: 'image',
          description: '画像ファイル（オプション、5MB以下）',
          required: false
        }
      ]
    },
    {
      name: 'end',
      description: 'Geminiとの会話セッションを終了する'
    },
    {
      name: 'settings',
      description: '個人設定の管理',
      options: [
        {
          name: 'view',
          description: '現在の設定を表示',
          type: 1
        },
        {
          name: 'set',
          description: '設定を変更',
          type: 1,
          options: [
            {
              name: 'response_style',
              description: '応答スタイル',
              type: 3,
              required: false,
              choices: [
                { name: '通常', value: 'normal' },
                { name: '丁寧', value: 'formal' },
                { name: 'カジュアル', value: 'casual' }
              ]
            },
            {
              name: 'detail_level',
              description: '詳細レベル',
              type: 3,
              required: false,
              choices: [
                { name: '簡潔', value: 'brief' },
                { name: '標準', value: 'medium' },
                { name: '詳細', value: 'detailed' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'admin-status',
      description: '【管理者】システム状況を確認'
    },
    {
      name: 'admin-maintenance',
      description: '【管理者】メンテナンスモードの切り替え',
      options: [
        {
          name: 'enable',
          description: 'メンテナンスモードを有効にするか',
          type: 5, // BOOLEAN
          required: false
        }
      ]
    }
  ];

  const url = `https://discord.com/api/v10/applications/${CONFIG.DISCORD_APPLICATION_ID}/commands`;
  
  commands.forEach(command => {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(command)
      });
      
      console.log(`Command ${command.name} registered:`, response.getContentText());
    } catch (error) {
      console.error(`Error registering command ${command.name}:`, error);
    }
  });
}

/**
 * 設定の初期化
 */
function initializeProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  // 必要な設定値を確認
  const requiredProperties = [
    'GEMINI_API_KEY',
    'DISCORD_BOT_TOKEN', 
    'DISCORD_APPLICATION_ID',
    'SPREADSHEET_ID'
  ];
  
  const missingProperties = [];
  requiredProperties.forEach(prop => {
    if (!properties.getProperty(prop)) {
      missingProperties.push(prop);
    }
  });
  
  if (missingProperties.length > 0) {
    console.log('Missing properties:', missingProperties);
    console.log('Please set these properties in Project Settings > Script Properties');
  } else {
    console.log('All required properties are set!');
  }
}

// ==================== 未実装の関数スタブ ====================

// 以下の関数は簡略化のため基本的な実装のみ提供
function handleInteractionComponent(interaction) { return createErrorResponse('ボタン機能は開発中です。'); }
function handleModalSubmit(interaction) { return createErrorResponse('モーダル機能は開発中です。'); }
function handleSettingsCommand(interaction) { return createErrorResponse('設定機能は開発中です。'); }
function handleAdminCleanupCommand(interaction) { return createErrorResponse('クリーンアップ機能は開発中です。'); }
function handleQualityReportCommand(interaction) { return createErrorResponse('品質レポート機能は開発中です。'); }
function handleAnalyticsCommand(interaction) { return createErrorResponse('分析機能は開発中です。'); }
function handleSecurityCommand(interaction) { return createErrorResponse('セキュリティ機能は開発中です。'); }
function getUserRequests(userId) { return []; }
function recordUserRequest(userId, timestamp) { }
function clearUserHistory(userId) { } 