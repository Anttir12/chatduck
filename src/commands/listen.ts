import 'dotenv/config';
import {ChatInputCommandInteraction, GuildMember, MessageEvent, SlashCommandBuilder} from 'discord.js';
import {AudioReceiveStream, createAudioResource, EndBehaviorType, getVoiceConnection} from '@discordjs/voice';
import * as prism from 'prism-media';
import {Command} from './command';
import * as websocket from 'websocket-stream';
import {getWsToken} from '../dbot-client';
import {addToQueue} from '../voice';
import * as fs from 'fs';

interface AudioListener {
    stream: AudioReceiveStream
    webSocket: websocket.WebSocketDuplex
}
const currentlyListening: Record<string, AudioListener> = {};

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('listen')
        .setDescription('Starts to listen and analyzing your speech'),
    async execute(interaction: ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember
        const userId = member.id.toString();
        if (userId in currentlyListening) {
            killListening(userId);
            await interaction.reply({content: 'No longer listening!', ephemeral: true});
        } else {
            const voiceChannel = member.voice?.channel;
            if (voiceChannel) {
                const userId = member.id.toString();
                const wsToken = await getWsToken();
                if (wsToken) {
                    const connection = getVoiceConnection(voiceChannel.guild.id);
                    const opusStream = connection.receiver.subscribe(userId, {
                        end: {
                            behavior: EndBehaviorType.Manual,
                        },
                    });
                    const ws = websocket(`${process.env.DBOT_LISTEN_STREAM}?wsToken=${wsToken}`)

                    currentlyListening[userId] = {stream: opusStream, webSocket: ws};
                    const oggStream = new prism.opus.OggLogicalBitstream({
                        opusHead: new prism.opus.OpusHead({
                            channelCount: 2,
                            sampleRate: 48000,
                        }),
                        pageSizeControl: {
                            maxPackets: 10,
                        },
                    });

                    ws.socket.addEventListener('open', () => {
                        console.log("Opened WebSocket connection!");
                        console.log("Starting to listen!");
                    })

                    ws.socket.addEventListener('error', (err) => {
                        console.log("Websocket error!");
                        console.log(err);
                        killListening(userId);
                    })

                    ws.socket.addEventListener('close', (cls) => {
                        console.log("Closed WebSocket connection!");
                        console.log(cls);
                        killListening(userId);
                    })

                    ws.socket.addEventListener('message', (cls: MessageEvent) => {
                        console.log("Message event");
                        if(cls.data instanceof ArrayBuffer)
                        {
                            try
                            {
                                const buffer = Buffer.from(cls.data);
                                addToQueue(buffer);
                            }
                            catch (e)
                            {
                                console.error("Error trying to play data from websocket");
                                console.error(e);
                            }

                        }

                    })

                    /*
                    // To save the file locally for test purposes
                    import * as fs from 'fs';
                    const writeStream = fs.createWriteStream('/tmp/jsdbot/output.opus')
                    opusStream.pipe(oggStream).pipe(writeStream);
                     */

                    opusStream.pipe(oggStream).pipe(ws);

                    const sttFeed = `${process.env.DBOT_STT_FEED}${wsToken}`;
                    console.log("SttFeed: "+sttFeed);
                    await interaction.reply({
                        content: `Listening you! Your stt feed: ${sttFeed}`,
                        ephemeral: true});
                } else {
                    await interaction.reply({content: 'Failed to get WS token', ephemeral: true})
                }
            } else {
                await interaction.reply({content: 'Your are not in a voice channel!', ephemeral: true});
            }
        }
    },
};

const killListening = (userId: string) => {
    const audioListener = currentlyListening[userId]
    if (audioListener) {
        console.log("Killing listening things")
        audioListener.stream.destroy()
        audioListener.webSocket.destroy()
        delete currentlyListening[userId]
        return true
    }
    return false
}

export {command};
