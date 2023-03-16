import {createAudioPlayer, createAudioResource, joinVoiceChannel} from '@discordjs/voice';
import 'dotenv/config';
import {VoiceBasedChannel, VoiceChannel} from 'discord.js';
import * as fs from 'fs';

const player = createAudioPlayer();
const audioResourceQueue: Array<Buffer> = []
export const initialiseVoiceThing = async () => {
	setInterval(async () => {
        if (player.state.status === 'idle' && audioResourceQueue.length > 0) {
            const finalBuffers = []
            while(audioResourceQueue.length > 0){
                finalBuffers.push(audioResourceQueue.shift())
            }
            const finalBuffer = Buffer.concat(finalBuffers)
            console.log("combined "+finalBuffers.length+" Buffers")
            const filename = "/tmp/temp_buffer.ogg";
            fs.writeFileSync(filename, finalBuffer);
            const resource = createAudioResource(filename);
            player.play(resource)
        }
	}, 1);
}

export const joinVoice = (voiceChannel: VoiceChannel|VoiceBasedChannel) => {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });
    connection.subscribe(player);
}

export const addToQueue = (resource: Buffer) => {
    audioResourceQueue.push(resource)
}


export { player };
