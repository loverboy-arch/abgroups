require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

// ---------------- CONFIG ----------------
const {
  DISCORD_TOKEN,
  ALERT_CHANNEL_ID,
  TELEGRAM_TOKEN,
  SUPABASE_URL,
  SUPABASE_KEY,
  WEBHOOK_SECRET,
  PORT
} = process.env;

// ---------------- DISCORD ----------------
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
let discordChannel;

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  discordChannel = await client.channels.fetch(ALERT_CHANNEL_ID);
  if (!discordChannel) console.log('Discord alert channel not found!');
});

// ---------------- TELEGRAM ----------------
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Listen to Telegram messages and forward to Discord + DB
tgBot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Optional: filter signals only
  if (!text.toLowerCase().includes('buy') && !text.toLowerCase().includes('sell')) return;

  // Discord embed
  const embed = new EmbedBuilder()
    .setTitle('Telegram Signal')
    .setDescription(text)
    .setColor(text.toLowerCase().includes('buy') ? 0x00ff00 : 0xff0000)
    .setTimestamp();

  if (discordChannel) discordChannel.send({ embeds: [embed] });

  // Save to Supabase
  await supabase.from('signals').insert([{ source: 'Telegram', content: text, created_at: new Date() }]);
});

// ---------------- SUPABASE ----------------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- EXPRESS WEBHOOK ----------------
const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  try {
    // Security check
    if (req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
      return res.status(401).send('Unauthorized');
    }

    const data = req.body;
    const symbol = data.symbol || 'Unknown';
    const action = data.action || 'Unknown';
    const price = data.price || 'N/A';
    const source = data.source || 'TradingView';

    // Discord embed
    const embed = new EmbedBuilder()
      .setTitle(`${symbol} Signal`)
      .setDescription(`**Action:** ${action}\n**Price:** ${price}\n**Source:** ${source}`)
      .setColor(action.toLowerCase() === 'buy' ? 0x00ff00 : 0xff0000)
      .setTimestamp();

    if (discordChannel) discordChannel.send({ embeds: [embed] });

    // Save to Supabase
    await supabase.from('signals').insert([{ symbol, action, price, source, created_at: new Date() }]);

    res.status(200).send('Signal received ✅');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error ❌');
  }
});

app.listen(PORT || 3000, () => {
  console.log(`Webhook listener running on port ${PORT || 3000}`);
});

// ---------------- LOGIN DISCORD ----------------
client.login(DISCORD_TOKEN);
