import { Client, GatewayIntentBits, Events } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const API_URL = process.env.API_URL || 'http://localhost:3000/api/music';

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith('!play') || message.author.bot) return;

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        message.reply('You need to be in a voice channel to play music!');
        return;
    }

    try {
        const response = await fetch(API_URL);
        const playlist = await response.json();

        if (!playlist || playlist.length === 0) {
            message.reply('No music found on the server.');
            return;
        }

        // Simplest lazist solution: just play a random track from the playlist
        const track = playlist[Math.floor(Math.random() * playlist.length)];

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(track.url);

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            message.reply(`Now playing: **${track.name}**`);
        });

        player.on('error', error => {
            console.error(`Audio player error: ${error.message}`);
        });
    } catch (error) {
        console.error(error);
        message.reply('Error fetching or playing music.');
    }
});

client.login(process.env.DISCORD_TOKEN);
