require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const token = process.env.DISCORD_TOKEN;
const appId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

const commands = JSON.parse(fs.readFileSync('./commands.json', 'utf-8'));
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 スラッシュコマンドを登録中...');

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(appId, guildId),
        { body: commands }
      );
      console.log('✅ GUILDコマンド（開発用）を登録しました');
    } else {
      await rest.put(
        Routes.applicationCommands(appId),
        { body: commands }
      );
      console.log('✅ GLOBALコマンドを登録しました（反映まで最大1時間）');
    }
  } catch (error) {
    console.error('❌ 登録中にエラーが発生:', error);
  }
})();