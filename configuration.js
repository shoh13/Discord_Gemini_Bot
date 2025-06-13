/**
 * Discord-Gemini Bot - 統合設定管理
 * 全ての設定値とヘルパー関数を一元管理
 */

// ==================== 基本設定 ====================

/**
 * 必須環境変数の定義
 */
const REQUIRED_PROPERTIES = {
  GEMINI_API_KEY: 'Gemini API キー',
  DISCORD_BOT_TOKEN: 'Discord Bot トークン', 
  DISCORD_APPLICATION_ID: 'Discord アプリケーションID',
  SPREADSHEET_ID: 'Google SpreadsheetのID'
};

/**
 * オプション環境変数の定義
 */
const OPTIONAL_PROPERTIES = {
  ADMIN_USER_IDS: '管理者のDiscord User ID（カンマ区切り）',
  MAINTENANCE_MODE: 'メンテナンスモード（true/false）',
  ALERT_WEBHOOK_URL: 'アラート通知用のWebhook URL'
};

// ==================== 機能設定 ====================

/**
 * AI対話設定
 */
const AI_CONFIG = {
  GEMINI_MODEL: 'gemini-1.5-flash',
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  HISTORY_RETENTION_HOURS: 24,
  MAX_RESPONSE_LENGTH: 2000,
  MAX_CONTEXT_MESSAGES: 5,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * セキュリティ設定
 */
const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_HOUR: 200,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 50,
  BLACKLIST_DURATION_HOURS: 24,
  CONTENT_FILTER_ENABLED: true,
  AUDIT_LOG_RETENTION_DAYS: 90,
  
  // コンテンツフィルタパターン
  SPAM_PATTERNS: [
    /(.)\1{10,}/g, // 同じ文字の連続
    /https?:\/\/[^\s]+/gi, // URL
    /discord\.gg\/[^\s]+/gi // Discord招待リンク
  ],
  
  SENSITIVE_INFO_PATTERNS: [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // クレジットカード番号
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN形式
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // メールアドレス
  ]
};

/**
 * UX設定
 */
const UX_CONFIG = {
  PERSONALIZATION_ENABLED: true,
  QUICK_REPLIES_ENABLED: true,
  CONVERSATION_CONTEXT_ENABLED: true,
  PROGRESS_UPDATES_ENABLED: true,
  RESPONSE_FORMATTING_ENABLED: true,
  
  // 応答スタイル選択肢
  RESPONSE_STYLES: {
    normal: '通常',
    formal: '丁寧',
    casual: 'カジュアル',
    technical: '技術的'
  },
  
  // 詳細レベル選択肢
  DETAIL_LEVELS: {
    brief: '簡潔',
    medium: '標準', 
    detailed: '詳細'
  }
};

/**
 * 監視・アラート設定
 */
const MONITORING_CONFIG = {
  ERROR_RATE_THRESHOLD: 0.1, // 10%
  RESPONSE_TIME_THRESHOLD: 5000, // 5秒
  API_USAGE_WARNING_THRESHOLD: 0.8, // 80%
  DATABASE_SIZE_WARNING: 10000, // 10,000行
  ALERT_COOLDOWN_MINUTES: 30,
  
  // 監視間隔
  MONITORING_INTERVALS: {
    REAL_TIME: 5, // 5分
    HOURLY: 60, // 1時間
    DAILY: 1440 // 24時間
  }
};

/**
 * データ管理設定
 */
const DATA_CONFIG = {
  BACKUP_RETENTION_DAYS: 30,
  CLEANUP_RETENTION_DAYS: 7,
  MAX_ROWS_PER_SHEET: 50000,
  
  // 必須スプレッドシートシート
  REQUIRED_SHEETS: {
    History: ['ConversationId', 'Timestamp', 'Question', 'Response', 'HasImage', 'UserId'],
    Errors: ['Timestamp', 'ErrorType', 'Message', 'UserId', 'Details'],
    Feedback: ['FeedbackId', 'Timestamp', 'ConversationId', 'UserId', 'Type', 'Rating', 'Comment'],
    UserPreferences: ['UserId', 'Language', 'ResponseStyle', 'IncludeEmojis', 'DetailLevel', 'Topics', 'LastUpdated'],
    SecurityEvents: ['Timestamp', 'EventType', 'UserId', 'Details', 'Source'],
    Performance: ['Timestamp', 'ResponseTime', 'Status', 'Details'],
    Reports: ['ReportId', 'Timestamp', 'Period', 'Summary', 'Insights', 'Recommendations'],
    SuspiciousActivity: ['Timestamp', 'UserId', 'ActivityType', 'Source'],
    AuditLog: ['Timestamp', 'Action', 'UserId', 'Details', 'Source'],
    ImprovementOpportunities: ['Timestamp', 'ConversationId', 'FeedbackCount', 'AverageRating', 'SatisfactionRate', 'Comments', 'Status']
  }
};

// ==================== Discord設定 ====================

/**
 * Discord API定数
 */
const DISCORD_CONSTANTS = {
  INTERACTION_TYPES: {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5
  },
  
  RESPONSE_TYPES: {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
    MODAL: 9
  },
  
  MESSAGE_FLAGS: {
    EPHEMERAL: 64
  },
  
  COMPONENT_TYPES: {
    ACTION_ROW: 1,
    BUTTON: 2,
    SELECT_MENU: 3,
    TEXT_INPUT: 4
  },
  
  BUTTON_STYLES: {
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4,
    LINK: 5
  }
};

/**
 * Slash Commands定義
 */
const SLASH_COMMANDS = [
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
            choices: Object.entries(UX_CONFIG.RESPONSE_STYLES).map(([value, name]) => ({ name, value }))
          },
          {
            name: 'detail_level',
            description: '詳細レベル',
            type: 3,
            required: false,
            choices: Object.entries(UX_CONFIG.DETAIL_LEVELS).map(([value, name]) => ({ name, value }))
          },
          {
            name: 'include_emojis',
            description: '絵文字を使用するか',
            type: 5, // BOOLEAN
            required: false
          }
        ]
      },
      {
        name: 'reset',
        description: '設定をデフォルトにリセット',
        type: 1
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
  },
  {
    name: 'admin-cleanup',
    description: '【管理者】データクリーンアップを実行',
    options: [
      {
        name: 'days',
        description: '保持期間（日数）',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 365
      }
    ]
  },
  {
    name: 'admin-backup',
    description: '【管理者】バックアップを作成'
  },
  {
    name: 'quality-report',
    description: '【管理者】会話品質レポートを生成',
    options: [
      {
        name: 'days',
        description: '分析期間（日数）',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 90
      }
    ]
  },
  {
    name: 'analytics',
    description: '【管理者】詳細分析レポートを生成',
    options: [
      {
        name: 'days',
        description: '分析期間（日数）',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 90
      },
      {
        name: 'format',
        description: 'レポート形式',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'サマリー', value: 'summary' },
          { name: '詳細', value: 'detailed' }
        ]
      }
    ]
  },
  {
    name: 'security',
    description: '【管理者】セキュリティ管理',
    options: [
      {
        name: 'report',
        description: 'セキュリティレポート',
        type: 1,
        options: [
          {
            name: 'days',
            description: '分析期間（日数）',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 30
          }
        ]
      },
      {
        name: 'blacklist',
        description: 'ブラックリスト管理',
        type: 1,
        options: [
          {
            name: 'action',
            description: 'アクション',
            type: 3,
            required: true,
            choices: [
              { name: '追加', value: 'add' },
              { name: '削除', value: 'remove' },
              { name: '一覧', value: 'list' }
            ]
          },
          {
            name: 'user',
            description: 'ユーザーID',
            type: 3,
            required: false
          },
          {
            name: 'reason',
            description: '理由',
            type: 3,
            required: false
          }
        ]
      }
    ]
  }
];

// ==================== ヘルパー関数 ====================

/**
 * 設定値の取得
 */
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  return {
    // 基本設定
    GEMINI_API_KEY: properties.getProperty('GEMINI_API_KEY'),
    DISCORD_BOT_TOKEN: properties.getProperty('DISCORD_BOT_TOKEN'),
    DISCORD_APPLICATION_ID: properties.getProperty('DISCORD_APPLICATION_ID'),
    SPREADSHEET_ID: properties.getProperty('SPREADSHEET_ID'),
    
    // オプション設定
    ADMIN_USER_IDS: (properties.getProperty('ADMIN_USER_IDS') || '').split(',').filter(id => id.trim()),
    MAINTENANCE_MODE: properties.getProperty('MAINTENANCE_MODE') === 'true',
    ALERT_WEBHOOK_URL: properties.getProperty('ALERT_WEBHOOK_URL'),
    
    // 機能設定
    ...AI_CONFIG,
    ...SECURITY_CONFIG,
    ...UX_CONFIG,
    ...MONITORING_CONFIG,
    ...DATA_CONFIG
  };
}

/**
 * 設定値の検証
 */
function validateConfiguration() {
  const properties = PropertiesService.getScriptProperties();
  const missingProperties = [];
  const warnings = [];
  
  // 必須プロパティのチェック
  Object.keys(REQUIRED_PROPERTIES).forEach(key => {
    const value = properties.getProperty(key);
    if (!value || value.trim() === '') {
      missingProperties.push({
        key: key,
        description: REQUIRED_PROPERTIES[key]
      });
    }
  });
  
  // オプションプロパティの警告
  Object.keys(OPTIONAL_PROPERTIES).forEach(key => {
    const value = properties.getProperty(key);
    if (!value || value.trim() === '') {
      warnings.push({
        key: key,
        description: OPTIONAL_PROPERTIES[key],
        impact: 'オプション機能が利用できません'
      });
    }
  });
  
  return {
    isValid: missingProperties.length === 0,
    missingProperties: missingProperties,
    warnings: warnings
  };
}

/**
 * 設定の一括設定
 */
function setAllProperties(propertyValues) {
  const properties = PropertiesService.getScriptProperties();
  
  try {
    properties.setProperties(propertyValues);
    console.log('Properties set successfully:', Object.keys(propertyValues));
    return { success: true };
  } catch (error) {
    console.error('Error setting properties:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 設定レポートの生成
 */
function generateConfigurationReport() {
  const validation = validateConfiguration();
  const properties = PropertiesService.getScriptProperties();
  
  let report = '🔧 **設定状況レポート**\n\n';
  
  // 基本設定の状況
  report += '**📋 必須設定**\n';
  Object.keys(REQUIRED_PROPERTIES).forEach(key => {
    const value = properties.getProperty(key);
    const status = value ? '✅' : '❌';
    report += `${status} ${REQUIRED_PROPERTIES[key]}\n`;
  });
  
  report += '\n**⚙️ オプション設定**\n';
  Object.keys(OPTIONAL_PROPERTIES).forEach(key => {
    const value = properties.getProperty(key);
    const status = value ? '✅' : '⚠️';
    report += `${status} ${OPTIONAL_PROPERTIES[key]}\n`;
  });
  
  // 機能設定の状況
  report += '\n**🚀 機能設定**\n';
  report += `• AI対話: ${AI_CONFIG.GEMINI_MODEL}\n`;
  report += `• セキュリティ: ${SECURITY_CONFIG.CONTENT_FILTER_ENABLED ? '有効' : '無効'}\n`;
  report += `• パーソナライゼーション: ${UX_CONFIG.PERSONALIZATION_ENABLED ? '有効' : '無効'}\n`;
  report += `• 監視: ${MONITORING_CONFIG.ERROR_RATE_THRESHOLD * 100}%閾値\n`;
  
  // 問題がある場合の警告
  if (!validation.isValid) {
    report += '\n**⚠️ 設定の問題**\n';
    validation.missingProperties.forEach(prop => {
      report += `❌ ${prop.description}が設定されていません\n`;
    });
  }
  
  if (validation.warnings.length > 0) {
    report += '\n**💡 推奨設定**\n';
    validation.warnings.forEach(warning => {
      report += `⚠️ ${warning.description}: ${warning.impact}\n`;
    });
  }
  
  return report;
}

/**
 * 開発環境用の設定テンプレート
 */
function generateDevelopmentTemplate() {
  return {
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
    DISCORD_BOT_TOKEN: 'YOUR_DISCORD_BOT_TOKEN_HERE',
    DISCORD_APPLICATION_ID: 'YOUR_DISCORD_APPLICATION_ID_HERE',
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
    ADMIN_USER_IDS: 'YOUR_DISCORD_USER_ID_1,YOUR_DISCORD_USER_ID_2',
    MAINTENANCE_MODE: 'false',
    ALERT_WEBHOOK_URL: 'YOUR_WEBHOOK_URL_FOR_ALERTS'
  };
}

/**
 * 本番環境用の設定検証
 */
function validateProductionConfiguration() {
  const validation = validateConfiguration();
  const properties = PropertiesService.getScriptProperties();
  
  const productionChecks = [];
  
  // セキュリティチェック
  if (!properties.getProperty('ADMIN_USER_IDS')) {
    productionChecks.push({
      level: 'ERROR',
      message: '管理者IDが設定されていません。セキュリティリスクがあります。'
    });
  }
  
  // アラート設定チェック
  if (!properties.getProperty('ALERT_WEBHOOK_URL')) {
    productionChecks.push({
      level: 'WARNING',
      message: 'アラート通知URLが設定されていません。問題の早期発見が困難になります。'
    });
  }
  
  // API制限チェック
  if (SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR > 1000) {
    productionChecks.push({
      level: 'WARNING',
      message: 'レート制限が緩すぎます。API制限に達する可能性があります。'
    });
  }
  
  return {
    ...validation,
    productionChecks: productionChecks,
    isProductionReady: validation.isValid && productionChecks.filter(c => c.level === 'ERROR').length === 0
  };
}

// ==================== エクスポート ====================

// 設定オブジェクトをグローバルに公開
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AI_CONFIG,
    SECURITY_CONFIG,
    UX_CONFIG,
    MONITORING_CONFIG,
    DATA_CONFIG,
    DISCORD_CONSTANTS,
    SLASH_COMMANDS,
    getConfig,
    validateConfiguration,
    setAllProperties,
    generateConfigurationReport,
    generateDevelopmentTemplate,
    validateProductionConfiguration
  };
} 