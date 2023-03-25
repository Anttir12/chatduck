import {Events, Message, TextBasedChannel} from "discord.js";
import {client} from "./index";
import {getWsToken} from "./dbot-client";
import * as WebSocket from "ws";


const gptChannelId = process.env.GPT4_CHANNEL


const initGpt4ws = async (userMessage: string, channel: TextBasedChannel, initMessagesCount = 3) => {
	const responseMessages: Message[] = [];
	const responseChunks: string[] = [];
	for (let i = 0; i < initMessagesCount; i++) {
		responseMessages.push(await channel.send("..."));
		responseChunks.push("");
	}
	try {
		const wsToken = await getWsToken();
		const gpt4ws = new WebSocket(`${process.env.DBOT_GPT4_STREAM}?wsToken=${wsToken}`);
		let entireResponse = "";
		let chunkWaiting = ""
		let done = false;
		let waitTime = 0;
		let responseInUse = 0;
		let incompleteCodeBlock: string|null = null;
		const maxWaitTime = 1250;
		const maxMessageLength = 1950; //Actual limit is 2000, just leaving 50 in case we want to add something
		gpt4ws.on('open', () => {
			gpt4ws.send(userMessage);
			waitTime = 500;
		})

		gpt4ws.on('error', (err) => {
			console.log("Websocket error!");
			console.log(err);
			responseMessages[responseInUse].edit(responseChunks[responseInUse] + " (Error)");
		})

		gpt4ws.on('close', (cls) => {
			console.log("Closed WebSocket connection!");
			for (let i = responseInUse + 1; i < responseMessages.length; i++) {
				responseMessages[i].delete();
			}
		})

		gpt4ws.on('message', async (data: WebSocket.Data) => {
			const responseJson = JSON.parse(data.toString())
			if (responseJson["type"] === "chunk") {
				entireResponse += responseJson["content"];
				chunkWaiting += responseJson["content"];
			} else if (responseJson["type"] === "end") {
				done = true;
				gpt4ws.close();
			}
		});

		const handle = (timeoutTime: number) => {
			let chunk = "";
			if(chunkWaiting.length <= maxMessageLength){
				chunk = chunkWaiting;
				chunkWaiting = ""
			} else {
				const words = chunkWaiting.split(" ")
				for(let i = 0; i < words.length; i++){
					const word = words[i];
					if(chunk.length + word.length <= maxMessageLength){
						chunk += word+" ";
					} else {
						chunkWaiting = words.slice(i, words.length).join(" ");
						break;
					}
				}
			}

			setTimeout(async () => {
				if (responseChunks[responseInUse].length + chunk.length > maxMessageLength) {
					const codeblockSplit = responseChunks[responseInUse].split("```");
					const codeblockCount = codeblockSplit.length - 1;
					if (codeblockCount % 2 != 0) {
						responseChunks[responseInUse] += "```"
						incompleteCodeBlock = codeblockSplit[codeblockSplit.length-1].split("\n")[0];
					} else {
						incompleteCodeBlock = null;
					}
					await responseMessages[responseInUse].edit(responseChunks[responseInUse])

					if (responseInUse + 1 >= responseMessages.length) {
						responseMessages.push(null);
						responseChunks.push("");
					}
					responseInUse += 1;

					if (incompleteCodeBlock != null) {
						responseChunks[responseInUse] += "```"+incompleteCodeBlock+"\n"
						incompleteCodeBlock = null;
					}
				}

				responseChunks[responseInUse] += chunk;
				let tmpMessage = responseChunks[responseInUse];
				if(!done){
					 tmpMessage += "...";
				}
				// This is so unfinished code block shows as a code block during stream
				const codeBlockCount = responseChunks[responseInUse].split("```").length - 1;
				if (codeBlockCount > 0 && codeBlockCount % 2 != 0) {
					tmpMessage += "```"
				}
				if(responseMessages[responseInUse] === null){
					responseMessages[responseInUse] = await channel.send(tmpMessage);
				}
				else{
					await responseMessages[responseInUse].edit(tmpMessage);
				}

				waitTime = Math.min(maxWaitTime, waitTime + 300);
				if(!done || chunkWaiting !== ""){
					handle(waitTime)
				}
			}, timeoutTime)
		}
		handle(waitTime)

	} catch(e) {
		for(const response of responseMessages){
			if(response.content.length < 10){
				await response.delete();
			}
			await channel.send("Something went wrong")
		}
	}
};

export const initialiseGptThing = async () => {
	client.on(Events.MessageCreate, async (message) => {
		if (message.author.id !== client.user.id && message.channel.id == gptChannelId) {
			await initGpt4ws(message.content, message.channel);
		}
	});
}