
import { chatsRepo } from '../repository/chat-repository.js';
import { enviorments } from './properties-mod.js';
import { authCodesRepo } from '../repository/authcodes-repository.js';
import BinanceTrading from './binance-client.js';
import emoji from 'node-emoji';
import { Telegraf } from 'telegraf';
import { Console as console } from './logger-mod.js';
import { channelsRepo } from '../repository/channels-repository.js';

// mappa dei bot attivi
const tradesbot = {};

const { sessionName } = enviorments();

export const formatDatTime = (ms) => {

    if (!!ms && !isNaN(ms)) {
        const datetime = new Date(ms);
        const yyyy = datetime.getFullYear();
        const mm = datetime.getMonth() + 1;
        const day = datetime.getDate();

        const hh = datetime.getHours();
        const mmm = datetime.getMinutes();
        const sec = datetime.getSeconds();
        const mss = datetime.getMilliseconds();

        return formatTwoDigitNumber(day) + "/" +
            formatTwoDigitNumber(mm) + "/" +
            formatTwoDigitNumber(yyyy) + " " +
            formatTwoDigitNumber(hh) + ":" + formatTwoDigitNumber(mmm) + ":" + formatTwoDigitNumber(sec) + "." + mss;
    }


    return '';
}

const formatTwoDigitNumber = (nb) => {
    return nb > 9 ? '' + nb : '0' + nb;
}

export const printTime = (ctx) => {
    try {
        const timestamp = binanceTime();

        timestamp.then((time) => {
            const serverTime = time.serverTime;
            const strTime = formatDatTime(serverTime);
            ctx.reply(`${emoji.emoji.clock1} Time ${strTime} ${emoji.emoji.clock1}`);
        });

    }
    catch (err) {
        console.error(err);
    }
}

/**
 * Invia un messaggio a tutti gli utenti connessi al bot
 * @param {Telegraf} bot 
 * @param {string} message 
 */
export async function sentMessageToAll(bot, message) {
    try {
        const users = await chatsRepo.findAllAuthorized();

        if (users && users.length > 0) {
            //await bot.telegram.sendMessage("-1001607425759",message);
            users.forEach(async ({ key }) => {
                if (bot && bot.telegram) {
                    if (!!key && key.indexOf(':')) {
                        const chatId = key.substring(0, key.indexOf(":")).trim();
                        return await bot.telegram.sendMessage(chatId, message);
                    }
                }
            });
        }

        /// manda a tutti i canali
        const channels = await channelsRepo.findAll();
        if (channels && channels.length > 0) {
            channels.forEach(async ({ chatId }) => {
                try {
                    return await bot.telegram.sendMessage(chatId, message);
                } catch (err) {
                    console.error(err);
                }
                return null;
            });
        }
    } catch (err) {
        console.error(err);
    }
}


export const showAuthMessage = async (ctx, keyboard) => {
    ctx.reply(`Your session is expired or you are not allowed to use the bot ${emoji.emoji.no_entry_sign}. Please use the "Login" button to access or You must request permission at System Administrator`, keyboard.reply());
}

/**
 * Verifica che l'utente sia autorizzato ad usare la stategia
 * 
 * @param {Context} ctx 
 */
export async function checkAuth(ctx, keyboard) {
    // cerca la sessione
    let authorized = ctx[sessionName].authorized;
    // verifica se la chatId è presente nel db
    const repo = await authCodesRepo.verifyCode(ctx.chat.id, ctx.chat.username);
    if (!authorized) {
        if (!repo) {
            // non sei autorizzato ad usare la chat
            showAuthMessage(ctx, keyboard);
            ctx[sessionName].authorized = false;
            authorized = false;
        }
        else {
            // sei autorizzato
            ctx[sessionName].authorized = true;
            await ctx.reply(`${emoji.emoji['spock-hand']} ${emoji.emoji['spock-hand']} Wellcome ${ctx.message.from.username}`);
            authorized = true;
        }
    }
    else if (repo) {
        // la sessione e' presente controlla lo stato
        ctx[sessionName].authorized = true;
        await ctx.reply(`${emoji.emoji.statue_of_liberty} Now you can start to play strategy ${emoji.emoji.exclamation}${emoji.emoji.exclamation}`);
        authorized = true;
    }
    else {
        // non sei autorizzato ad usare la chat
        showAuthMessage(ctx, keyboard);
        authorized = false;
    }

    return authorized;
}

export function isTradingBotInstanceNull(ctx) {
    return !tradesbot[ctx.chat.id];
}

/**
 * Ottiene l'instanza del bot di trading
 * @param {Context} ctx 
 * @returns {BinanceTrading}
 */
export async function tradingBotInstance(ctx) {
    if (ctx.chat) {
        if (!tradesbot[ctx.chat.id]) {
            tradesbot[ctx.chat.id] = new BinanceTrading(ctx.chat);
        }

        return tradesbot[ctx.chat.id];
    }
    return null;
}

export async function unloadTradingBotInstance(ctx) {
    if (tradesbot[ctx.chat.id]) {
        tradesbot[ctx.chat.id] = null;
    }

    return true;
}

/**
 * Delete alla in session name
 * @param {string} sessionName 
 * @returns 
 */
export async function unloadSession(sessionName) {

    try {
        await chatsRepo.deleteKey(sessionName);
    }
    catch (err) {
        console.error(err);
    }

    return false;
}