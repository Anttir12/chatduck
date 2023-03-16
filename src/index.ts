import { readdirSync } from 'fs';
import { join } from 'path';
//import { generateDependencyReport } from '@discordjs/voice';
import { Client, GatewayIntentBits, Collection } from 'discord.js';

import 'dotenv/config';
import {Command} from "./commands/command";
import {initialiseDbotClient} from "./dbot-client";
import {initialiseVoiceThing} from "./voice";
import {getVoiceConnection} from "@discordjs/voice";

const client = new Client({ intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
]});

// Dynamically load and register commands from commands directory
const commands = new Collection<string, Command>();
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.startsWith('command'));


(async () => {
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file).slice(0, -3);  // Slice the .js
		const commandFile = await import(filePath);
		commands.set(commandFile.command.data.name, commandFile.command);
	}
	await initialiseVoiceThing();
	await initialiseDbotClient();
})();

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if(interaction.replied) {
			await interaction.editReply({ content: 'There was an error while executing this command!'});
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}


	}
});

client.on("ready", () => {
	console.log('Connected to Discord server');
	//console.log(generateDependencyReport());
});
client.on("disconnect", () => {
	console.log('Disconnected from Discord server');
});
client.on("reconnecting", () => {
	console.log('Reconnecting to Discord server');
});
client.on('error', (error: Error) => {
	console.error("Discord error:", error);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	const botInVoice = Boolean(newState.guild.members.me.voice.channel);
	const botInOldChannel = botInVoice && oldState.channel?.members.some(member => member.user.id === client.user.id);

	if (botInOldChannel) {
		if(oldState.channel.members.size < 2 && botInVoice) {
			console.log("Leaving voice soon...");
			setTimeout(() => {
				if(oldState.channel.members.size < 2) {
					const connection = getVoiceConnection(newState.guild.id);
					connection.destroy();
					console.log("Left voice");
				} else {
					console.log("Never mind. I'm no longer alone");
				}
				}, 2500);
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
