import {createAudioPlayer, joinVoiceChannel} from '@discordjs/voice';
import 'dotenv/config';
import {VoiceBasedChannel, VoiceChannel} from 'discord.js';

const player = createAudioPlayer();

const joinVoice = (voiceChannel: VoiceChannel|VoiceBasedChannel) => {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });
    connection.subscribe(player);
}

export { player, joinVoice };
