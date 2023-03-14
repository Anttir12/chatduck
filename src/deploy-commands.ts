import { join } from "path";
import { readdirSync } from "fs";

import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import 'dotenv/config';

(async () => {
	const commands = [];
	const commandsPath = join(__dirname, 'commands');
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.startsWith('command'));

	for (const file of commandFiles) {
		const filePath = join(commandsPath, file).slice(0, -3);  // Slice the .js
		const commandFile = await import(filePath);
		commands.push(commandFile.command.data.toJSON());
	}

	const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

	rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), { body: commands })
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);
})();