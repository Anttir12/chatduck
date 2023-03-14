import {ChatInputCommandInteraction, GuildMember, SlashCommandBuilder, VoiceBasedChannel} from 'discord.js';
import {joinVoice} from '../voice';
import { Command } from './command';


const command: Command = {
	data: new SlashCommandBuilder().setName('join').setDescription('Joins voice with you'),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember
		const voiceChannel: VoiceBasedChannel = member.voice?.channel;
		if (voiceChannel) {
			joinVoice(voiceChannel);
			await interaction.reply({ content: 'Joined!', ephemeral: true });
		}
		else {
			await interaction.reply({ content: 'Your are not in a voice channel!', ephemeral: true});
		}
	},
};

export { command };