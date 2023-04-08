import 'dotenv/config';
import axios from "axios";

const BASE_URL = process.env.DBOT_BASE_URL;

interface AccessToken {
    access: string
}

interface Tokens {
    access: string,
    refresh: string
}

let currentTokens: Tokens = null;

const getTokens = async () => {
    try {
        console.log("Trying to get tokens.")
        const tokenResponse = await axios.post<Tokens>(BASE_URL + 'token', {
            username: process.env.DBOT_USERNAME,
            password: process.env.DBOT_PASSWORD,
        }, {
            headers: {Accept: 'application/json',},
        });
        if(tokenResponse && tokenResponse.status >= 200 && tokenResponse.status < 300){
            currentTokens = tokenResponse.data;
        }
    } catch (e) {
        currentTokens = null;
        console.log("Failed to get tokens.")
        console.log(e.response)
        setTimeout(getTokens, 10000);
    }
}

const refreshAccessToken = async () => {
    try {
        const tokenResponse = await axios.post<AccessToken>(BASE_URL + 'token/refresh', {
            refresh: currentTokens.refresh
        }, {
            headers: {Accept: 'application/json'},
        });
        if(tokenResponse && tokenResponse.status >= 200 && tokenResponse.status < 300){
            currentTokens.access = tokenResponse.data.access;
        }
    } catch (e) {
        currentTokens = null;
        console.log("Failed to refresh access tokens.")
        console.log(e.response)
        setTimeout(getTokens, 5000);
    }
}

export const getWsToken = async () => {
    let wsToken = null
    try {
        const response = await axios.post(BASE_URL + 'token/ws', {},
            {headers: {Authorization: 'Bearer ' + currentTokens.access}});
        if(response && response.status >= 200 && response.status < 300){
            wsToken = response.data.token;
        }
    } catch (e) {
        console.log("Failed to get ws token.")
        console.log(e.response)
    }
    return wsToken
}


export const initialiseDbotClient = async () => {
    await getTokens();
    setInterval(getTokens, 21600000);  // refresh token is valid for 24 hours but refresh every 6 hours anyway
    setInterval(refreshAccessToken, 150000);  // Access token is valid for 5 minutes. let's refresh it every 2,5 minutes
};
