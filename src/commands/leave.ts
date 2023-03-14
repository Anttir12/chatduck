import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import {Command} from './command';

const command: Command = {
	data: new SlashCommandBuilder().setName('leave').setDescription('Leaves voice channel'),
	async execute(interaction) {
		const connection = getVoiceConnection(interaction.guild.id);
		if (connection) {
			connection.destroy();
			interaction.reply({ content: 'Left voice', ephemeral: true });
		}
		else {
			interaction.reply({ content: 'I\'m not in voice', ephemeral: true });
		}
	},
};

export { command };