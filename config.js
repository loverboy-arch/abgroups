require('dotenv').config();

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  discordChannelId: process.env.DISCORD_CHANNEL_ID,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  webhookSecret: process.env.WEBHOOK_SECRET,
  port: process.env.PORT || 3000
};
