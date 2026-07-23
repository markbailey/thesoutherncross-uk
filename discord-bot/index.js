import { Client, GatewayIntentBits, Events } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ffmpegPath from 'ffmpeg-static';
import dns from 'dns';

// Force IPv4 to fix Discord UDP connection timeouts on Windows servers
dns.setDefaultResultOrder('ipv4first');
process.env.FFMPEG_PATH = ffmpegPath;
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

// In-memory queue per guild
const queues = new Map();

async function playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.tracks.length === 0) {
        queue.connection.destroy();
        queues.delete(guildId);
        return;
    }

    const track = queue.tracks.shift();
    queue.currentTrack = track;
    try {
        // use local file path since bot runs in the same workspace
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        let musicDir = process.env.MUSIC_DIR || path.join(__dirname, '..', 'public', 'music');
        if (!fs.existsSync(musicDir)) {
            musicDir = path.join(__dirname, '..', 'wwwroot', 'public', 'music');
        }
        
        const filePath = path.join(musicDir, track.name);
        
        if (!fs.existsSync(filePath)) {
            queue.textChannel.send(`File not found at path: ${filePath}`);
            playNext(guildId);
            return;
        }

        const resource = createAudioResource(filePath);
        resource.playStream.on('error', error => {
            console.error('Resource Error:', error);
            queue.textChannel.send('Error playing the audio stream.');
        });

        queue.player.play(resource);
        queue.textChannel.send(`Now playing: **${track.name}**`);
    } catch (e) {
        console.error('PlayNext Error:', e);
        queue.textChannel.send(`Failed to play **${track.name}**: ${e.message}`);
        playNext(guildId);
    }
}

import { generateDependencyReport } from '@discordjs/voice';

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    console.log(generateDependencyReport());
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') {
        const helpText = `**Available Commands:**
\`!play [trackname]\` - Play a track or queue it. Plays a random track if no name provided.
\`!play [track1], [track2]\` - Queue multiple tracks at once.
\`!playall\` - Queue all available tracks on the server.
\`!skip\` - Skip the current track.
\`!stop\` - Stop playing and clear the queue.
\`!queue\` or \`!playlist\` - Show the current queue.
\`!tracks\` - List all available tracks.
\`!help\` - Show this help message.`;
        return message.reply(helpText);
    }

    if (command === 'tracks') {
        try {
            const response = await fetch(API_URL);
            const playlist = await response.json();
            if (!playlist || playlist.length === 0) {
                return message.reply('No music found on the server.');
            }
            const trackNames = playlist.map(t => t.name).join('\n');
            return message.reply(`**Available Tracks:**\n${trackNames.slice(0, 1900)}`); // limit discord message size
        } catch (e) {
            return message.reply('Error fetching tracks.');
        }
    }

    if (!['play', 'playall', 'skip', 'stop', 'queue', 'playlist'].includes(command)) return;

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        return message.reply('You need to be in a voice channel!');
    }

    const guildId = message.guild.id;
    let queue = queues.get(guildId);

    if (command === 'stop') {
        if (!queue) return message.reply('Nothing is playing.');
        queue.connection.destroy();
        queues.delete(guildId);
        return message.reply('Stopped playing and cleared the queue.');
    }

    if (command === 'skip') {
        if (!queue) return message.reply('Nothing is playing.');
        queue.player.stop(); // Triggers Idle to play next
        return message.reply('Skipped track.');
    }

    if (command === 'queue' || command === 'playlist') {
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) return message.reply('The queue is empty.');
        let text = `**Currently Playing:**\n${queue.currentTrack ? queue.currentTrack.name : 'Nothing'}\n\n`;
        if (queue.tracks.length > 0) {
            text += `**Up Next:**\n` + queue.tracks.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
        } else {
            text += `*No tracks in queue.*`;
        }
        return message.reply(text.slice(0, 1900));
    }

    if (command === 'play' || command === 'playall') {
        try {
            const response = await fetch(API_URL);
            const playlist = await response.json();

            if (!playlist || playlist.length === 0) {
                return message.reply('No music found on the server.');
            }

            let tracksToQueue = [];
            if (command === 'playall') {
                tracksToQueue = [...playlist];
                // Shuffle the playlist for variety
                tracksToQueue.sort(() => Math.random() - 0.5);
            } else if (args.length > 0) {
                const queries = args.join(' ').split(',').map(q => q.trim().toLowerCase());
                for (const query of queries) {
                    if (!query) continue;
                    const found = playlist.find(t => t.name.toLowerCase().includes(query));
                    if (found) {
                        tracksToQueue.push(found);
                    } else {
                        message.channel.send(`Track not found: **${query}**`).catch(console.error);
                    }
                }
                if (tracksToQueue.length === 0) return;
            } else {
                tracksToQueue.push(playlist[Math.floor(Math.random() * playlist.length)]);
            }

            if (!queue) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false,
                    connectionTimeout: 30000
                });

                connection.on('stateChange', (oldState, newState) => {
                    console.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);
                });
                connection.on('error', console.error);
                // connection.on('debug', console.log); // uncomment if needed, can be noisy

                const player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Play,
                    },
                });

                queue = {
                    connection,
                    player,
                    textChannel: message.channel,
                    tracks: [],
                    currentTrack: null
                };

                queues.set(guildId, queue);

                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    playNext(guildId);
                });

                player.on('error', error => {
                    console.error(`Audio player error: ${error.message}`);
                    playNext(guildId);
                });

                for (const track of tracksToQueue) {
                    queue.tracks.push(track);
                }
                
                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
                    playNext(guildId);
                } catch (error) {
                    console.error('Connection failed to be ready:', error);
                    connection.destroy();
                    queues.delete(guildId);
                    message.channel.send('Failed to connect to the voice channel in time.').catch(console.error);
                }
            } else {
                for (const track of tracksToQueue) {
                    queue.tracks.push(track);
                }
                const trackNames = tracksToQueue.map(t => t.name).join(', ');
                return message.reply(`Queued: **${trackNames.slice(0, 1900)}**`);
            }
        } catch (error) {
            console.error(error);
            message.reply('Error fetching or playing music.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
