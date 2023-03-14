import {createAudioPlayer, joinVoiceChannel} from '@discordjs/voice';
import { createClient } from 'redis';
import 'dotenv/config';
import {VoiceBasedChannel, VoiceChannel} from 'discord.js';

const player = createAudioPlayer();
export const r = createClient({
    url: process.env.REDIS_URL,
});

const joinVoice = (voiceChannel: VoiceChannel|VoiceBasedChannel) => {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });
    connection.subscribe(player);

    const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
      const newUdp = Reflect.get(newNetworkState, 'udp');
      clearInterval(newUdp?.keepAliveInterval);
    }
    connection.on('stateChange', (oldState, newState) => {
      Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
      Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
    });

}

export { player, joinVoice };
