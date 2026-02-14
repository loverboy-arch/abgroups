require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

// ============================
// DISCORD BOT SETUP
// ============================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const discordChannelId = process.env.ALERT_CHANNEL_ID;
client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);

  // Register slash commands (guild commands for instant update)
  const commands = [
    new SlashCommandBuilder()
      .setName('risk')
      .setDescription('Calculate risk & position size')
      .addNumberOption(opt => opt.setName('capital').setDescription('Your total capital').setRequired(true))
      .addNumberOption(opt => opt.setName('riskpercent').setDescription('Risk percentage').setRequired(true))
      .addNumberOption(opt => opt.setName('stoploss').setDescription('Stop-loss points').setRequired(true))
      .addStringOption(opt => opt.setName('symbol').setDescription('Trading symbol (e.g. NIFTY)').setRequired(false))
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: commands })
    .then(() => console.log('✅ Slash commands registered'))
    .catch(console.error);
});

// ============================
// EXPRESS SERVER FOR MACRODROID WEBHOOKS
// ============================
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    const channel = await client.channels.fetch(discordChannelId);

    const embed = new EmbedBuilder()
      .setTitle("📈 AB GROUP’S Alert")
      .setDescription(req.body.message || "Alert Triggered")
      .setColor(0x00C2FF)
      .addFields(
        { name: "Info", value: req.body.message || "N/A", inline: true },
        { name: "Time", value: new Date().toLocaleString(), inline: true }
      )
      .setFooter({ text: "AB GROUP’S – Trade Smart" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => console.log("🌐 Webhook server running"));

// ============================
// SLASH COMMAND HANDLER
// ============================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'risk') {
    const capital = interaction.options.getNumber('capital');
    const riskPercent = interaction.options.getNumber('riskpercent');
    const stopLoss = interaction.options.getNumber('stoploss');
    const symbol = interaction.options.getString('symbol') || "N/A";

    const riskAmount = (capital * riskPercent) / 100;
    const positionSize = riskAmount / stopLoss;

    const embed = new EmbedBuilder()
      .setTitle("📊 AB GROUP’S Risk Calculator")
      .setColor(0xFFD700)
      .addFields(
        { name: "🏦 Capital", value: capital.toLocaleString(), inline: true },
        { name: "🎯 Risk %", value: `${riskPercent}%`, inline: true },
        { name: "💸 Risk Amount", value: riskAmount.toFixed(2), inline: true },
        { name: "⚡ Position Size", value: positionSize.toFixed(2), inline: true },
        { name: "📌 Symbol", value: symbol, inline: true }
      )
      .setFooter({ text: "AB GROUP’S – Trade Smart" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// ============================
// TELEGRAM BOT SETUP (Optional)
// ============================
if (process.env.TELEGRAM_TOKEN) {
  const telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

  telegramBot.on('message', async (msg) => {
    if (!msg.text) return;

    try {
      const channel = await client.channels.fetch(discordChannelId);
      const embed = new EmbedBuilder()
        .setTitle("📈 AB GROUP’S Alert")
        .setDescription(msg.text)
        .setColor(0x00C2FF)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Telegram forwarding error:", error);
    }
  });
}
