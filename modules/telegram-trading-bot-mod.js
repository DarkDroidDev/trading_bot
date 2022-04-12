import { Markup, Telegraf } from 'telegraf';
import { chatSession } from './session-middleware-mod.js';
import emoji from 'node-emoji';
import { enviorments } from './properties-mod.js';
import dataSource from './stored-data-mod.js';
import {
    checkAuth, showAuthMessage,
} from './utilitiies-mod.js';
import { strategyClient } from './server/strategy-ws-client.js';
import { createRequire } from "module";
import { authCodesRepo } from '../repository/authcodes-repository.js';
import BinanceTrading from './binance-client.js';
import { Console as console } from './logger-mod.js';
import { chatsRepo } from '../repository/chat-repository.js';

const require = createRequire(import.meta.url);

const { Keyboard } = require('telegram-keyboard')

const { telegram, sessionName } = enviorments();

const secretPath = telegram.secretPath;



const mainKeyboard = Keyboard.make([
    [Markup.button.callback(`${emoji.emoji.running} START`, 'START'),
    Markup.button.callback(`${emoji.emoji.open_hands} STOP`, 'STOP'),
     /* Markup.button.callback(`${emoji.emoji.closed_lock_with_key} CLOSE ALL`, 'CLOSE ALL')*/], // First row
    [Markup.button.callback(`${emoji.emoji.zzz} PAUSE`, 'PAUSE'),
    Markup.button.callback(`${emoji.emoji.moneybag} BALANCE`, 'BALANCE')], // Second row
    [Markup.button.callback(`${emoji.emoji.joystick} SETTINGS`, 'SETTINGS')]
]);

const stopKeyborad = Keyboard.make([
    [Markup.button.callback(`${emoji.emoji.running} START`, 'START'),
    Markup.button.callback(`${emoji.emoji.moneybag} BALANCE`, 'BALANCE')], // Second row
    [Markup.button.callback(`${emoji.emoji.joystick} SETTINGS`, 'SETTINGS')]
]);

const startKeyboard = Keyboard.make([
    [Markup.button.callback(`${emoji.emoji.open_hands} STOP`, 'STOP'),
    /* Markup.button.callback(`${emoji.emoji.closed_lock_with_key} CLOSE ALL`, 'CLOSE ALL')*/], // First row
    [Markup.button.callback(`${emoji.emoji.zzz} PAUSE`, 'PAUSE'),
    Markup.button.callback(`${emoji.emoji.moneybag} BALANCE`, 'BALANCE')], // Second row
    [Markup.button.callback(`${emoji.emoji.joystick} SETTINGS`, 'SETTINGS')]
]);

const pauseKeyboard = Keyboard.make([
    [Markup.button.callback(`${emoji.emoji.open_hands} STOP`, 'STOP'),
     /* Markup.button.callback(`${emoji.emoji.closed_lock_with_key} CLOSE ALL`, 'CLOSE ALL')*/], // First row
    [Markup.button.callback(`${emoji.emoji.moneybag} BALANCE`, 'BALANCE')], // Second row
    [Markup.button.callback(`${emoji.emoji.joystick} SETTINGS`, 'SETTINGS')]
]);

const loginKeyboard = Keyboard.make([Markup.button.callback(`${emoji.emoji.door} LOGIN`, 'LOGIN')]);
var currentKeyborad = null;

// contiene le informazioni sull'instanza di binace
const binanceInstanceInfo = {
    settingsLoaded: false,
    attached: false,
    symbol: '',
    binanceConnected: false,
    chatId: -1
}
var tradingBot;
try {
    tradingBot = new Telegraf(telegram.token);

    // aggiungi middleware della sessione
    tradingBot.use(chatSession({
        sessionName
    }));

    // mostra il link per gestire i settings
    tradingBot.hears(`${emoji.emoji.joystick} SETTINGS`, async (ctx) => {
        // if (!strategyClient.opened) {
        //     ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);

        //     return;
        // }

        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        try {
            var min = 10000;
            var max = 99999;
            // genera il codice di autorizzazione
            const authCode = Math.floor(Math.random() * (max - min + 1)) + min;

            const storeCode = await authCodesRepo.model.findOne({ chatId: ctx.chat.id });

            if (storeCode && storeCode._id) {
                const result = await authCodesRepo.model.updateOne({ chatId: ctx.chat.id }, { $set: { 'code': authCode } });

                if (result && result.modifiedCount == 1) {
                    const linkToChangeSettings = process.env.SETTINGS_LINK

                    await ctx.reply(`Use this link to change the settings  ${linkToChangeSettings}`);
                    await ctx.reply(`The access code is ${authCode}`);
                }
            }
        } catch (err) {
            await ctx.reply(`${emoji.emoji.disappointed_relieved} Can't provide link to change settings. Retry later`);
        }
    });

    // 
    tradingBot.hears(`${emoji.emoji.running} START`, (ctx) => {
        if (!strategyClient.opened) {
            ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
            return;
        }

        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        ctx.reply(`Wait, I'm starting strategy on ${binanceInstanceInfo.symbol} ${emoji.emoji.black_medium_small_square}${emoji.emoji.black_medium_small_square}${emoji.emoji.black_medium_small_square}`);

        // invia messaggio per ottenere le info sulla sessione
        sendToStrategy(ctx.chat.id, 'session_request_for_start', {
            from: ctx.from.id
        });
    });

    tradingBot.hears(`${emoji.emoji.open_hands} STOP`, (ctx) => {
        if (!strategyClient.opened) {
            ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
            return;
        }
        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        if (!binanceInstanceInfo.attached) {
            ctx.reply(`${emoji.emoji.warning} You should start a strategy before stopping it`);
            return;
        }

        ctx.reply(`${emoji.emoji.x}${emoji.emoji.x}${emoji.emoji.x} await to stopping strategy... `)

        // invia alla strategia il segnale di pausa
        // sendToStrategy(ctx.chat.id, 'stop_strategy', {
        //     from: ctx.from.id
        // });
        sendToStrategy(ctx.chat.id, 'detach_graph_and_stop', {
            from: ctx.from.id
        });
    });

    tradingBot.hears(`${emoji.emoji.closed_lock_with_key} CLOSE ALL`, (ctx) => {
        if (!strategyClient.opened) {
            ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
            return;
        }
        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        if (!binanceInstanceInfo.attached) {
            ctx.reply(`${emoji.emoji.warning} You should start a strategy before stopping it`);
            return;
        }

        ctx.reply(`${emoji.emoji.x}${emoji.emoji.x}${emoji.emoji.x} await to stopping strategy... `)

        // invia alla strategia il segnale di pausa
        sendToStrategy(ctx.chat.id, 'detach_graph_and_stop', {
            from: ctx.from.id
        });
    });

    tradingBot.hears(`${emoji.emoji.zzz} PAUSE`, (ctx) => {

        if (!strategyClient.opened) {
            ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
            return;
        }

        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        if (!binanceInstanceInfo.attached || !binanceInstanceInfo.settingsLoaded || !binanceInstanceInfo.binanceConnected) {
            ctx.reply(`${emoji.emoji.small_red_triangle} ${emoji.emoji.warning} You should start a strategy before pausing it`);
            return;
        }

        ctx.reply(`${emoji.emoji.money_with_wings}${emoji.emoji.money_with_wings}${emoji.emoji.money_with_wings} await to pausing strategy... `)
        // invia alla strategia il segnale di pausa
        sendToStrategy(ctx.chat.id, 'pause_strategy', {
            from: ctx.from.id
        });
    });


    tradingBot.hears(`${emoji.emoji.moneybag} BALANCE`, async (ctx) => {
        // if (!strategyClient.opened) {
        //     ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
        //     return;
        // }

        if (!ctx[sessionName].authorized) {
            showAuthMessage(ctx, loginKeyboard);
            return
        }

        try {
            ctx.reply(`${emoji.emoji.money_with_wings} Wait for Balance`)
            const bInstance = new BinanceTrading({
                chatId: ctx.chat.id
            });

            const accountInfo = await bInstance.accountInfo();

            const account = await authCodesRepo.model.findOne({ chatId: ctx.chat.id });

            if (accountInfo.assets && accountInfo.assets.length > 0) {
                if (account && account.defaultCurrency) {
                    const balance = accountInfo.assets.find(({ asset }) => asset === account.defaultCurrency);
                    if (balance) {
                        const { walletBalance } = balance;
                        ctx.reply(`${emoji.emoji.moneybag} The Wallet balance is: ${Number(walletBalance).toLocaleString()} ${account.defaultCurrency} ${emoji.emoji.moneybag}`);
                    }
                    else {
                        // mostra tutti nell'asset
                        accountInfo.assets.map(({ asset, walletBalance }) => {
                            ctx.reply(`${emoji.emoji.moneybag} ${Number(walletBalance).toLocaleString()} ${asset} ${emoji.emoji.moneybag}`)
                        });
                    }
                }
                else {
                    accountInfo.assets.map(({ asset, walletBalance }) => {
                        ctx.reply(`${emoji.emoji.moneybag} ${Number(walletBalance).toLocaleString()} ${asset} ${emoji.emoji.moneybag}`)
                    });
                }
            }
            else {
                ctx.reply(`${emoji.emoji.grimacing} Ops error to retrieve wallet balance. retry later`);
            }
        }
        catch (err) {
            console.error(err);
            await ctx.reply(`${emoji.emoji.grimacing} Ops error to retrieve wallet balance. retry later`);
        }
    });

    /// esegue il login se non si e' autorizzati
    tradingBot.hears(`${emoji.emoji.door} LOGIN`, async (ctx) => {
        try {
            // Using context shortcut
            const auth = await checkAuth(ctx, loginKeyboard);

            if (auth) {
                // invia il messaggio che il bot è in start
                sendToStrategy(ctx.chat.id, 'bot_started', {
                    from: ctx.from.id
                });
                setTimeout(() => {
                    setKeybordFromStatus(binanceInstanceInfo.status);
                    ctx.reply(`Use the buttons to perform actions on the strategy`, currentKeyborad.reply());
                }, 1000);
            }

        } catch (err) {
            console.log("error ", err);
        }
    });
    /// allo start il bot deve:
    // verificare che l'utente abbia le autorizzazioni
    /// verificare che una strategia sia in running
    tradingBot.command('/start', async (ctx) => {
        if (!strategyClient.opened) {
            ctx.reply(`${emoji.emoji.grimacing} Oops, the strategy server is not responding`);
            return;
        }
        try {
            // Using context shortcut
            const auth = await checkAuth(ctx, loginKeyboard);

            if (auth) {
                // invia il messaggio che il bot è in start
                sendToStrategy(ctx.chat.id, 'bot_started', {
                    from: ctx.from.id
                });
                setTimeout(() => {
                    setKeybordFromStatus(binanceInstanceInfo.status);
                    ctx.reply(`Use the buttons to perform actions on the strategy`, currentKeyborad.reply());
                }, 1000);
            }

        } catch (err) {
            console.log("error ", err);
        }
    });

    tradingBot.command('keyboard', (ctx) => {
        ctx.reply(`${emoji.emoji.keyboard}`, mainKeyboard.reply());
    });

    tradingBot.command('/quit', async (ctx) => {
        try {
            const key = `${ctx.from.id}:${ctx.chat.id}`;
            await chatsRepo.model.deleteOne({ key });
            // Explicit usage
            ctx.telegram.leaveChat(ctx.message.chat.id);
            // Context shortcut
            ctx.leaveChat();
        } catch (err) {

        }
    });
    // mostra i dati della chat
    tradingBot.command("/whoiam", (ctx) => {
        ctx.reply(`userId: ${ctx.chat.id}`);
        ctx.reply(`username: ${ctx.chat.username}`);
        ctx.reply(`first name: ${ctx.chat.first_name}`);
        ctx.reply(`last name: ${ctx.chat.last_name}`);
        ctx.reply(`type: ${ctx.chat.type}`);
    });
} catch (err) {
    console.error(err);
}
/**
 * Invia un messaggio alla strategia
 * 
 * @param {Number} chatId 
 * @param {string} cmd 
 * @param {string} data 
 */
const sendToStrategy = (chatId, cmd, data) => {
    if (chatId && strategyClient.opened) {
        const objToSend = {
            chatId,
            cmd,
            ...data
        };

        strategyClient.ws.send(JSON.stringify(objToSend));
    }
}
///////////////////////// FUNZIONI DI START AND STOP ///////////////////////////
/**
 * Allo start del server devo andare a verificare se la strategia e' attiva
 * se si dovrebbe partire la sessione associata all'utente.
 * 
 * @param {*} data 
 */
const startUpServer = () => {
    // fase 1:
    //sendToStrategy(-1, 'server_bot_started');
    console.log(`bot server running on port ${telegram.defaultPort}`);
}

/**
 * Hook di ricezione dei messaggi dal server Http
 * @param {*} data 
 */
export const onReciveCmdFromStrategy = async (data) => {

    try {
        if (data && data.cmd) {
            const command = data.cmd;
            const recivedData = data.data;

            console.debug(`recieved command ${command}`);

            switch (command) {
                // ottiene le info di sessione in seguito al comando /start
                // in base a queste info dovranno essere inviti messaggi per instruite l'utente sul da farsi
                case 'session_info':

                    let actualStatus = binanceInstanceInfo.status;

                    binanceInstanceInfo.attached = recivedData.attached;
                    binanceInstanceInfo.binanceConnected = recivedData.binanceConnected;
                    binanceInstanceInfo.settingsLoaded = recivedData.settingsLoaded;
                    binanceInstanceInfo.symbol = recivedData.symbol;
                    binanceInstanceInfo.status = recivedData.status;
                    binanceInstanceInfo.chatId = recivedData.chatId;

                    if (actualStatus !== recivedData.status) {
                        setKeybordFromStatus(binanceInstanceInfo.status);
                        tradingBot.telegram.sendMessage(binanceInstanceInfo.chatId, `${emoji.emoji.keyboard}`, currentKeyborad.reply());
                    }
                    break;
            }
        }
    }
    catch (err) {
        console.error(err);
    }
}

try {
    if (!process.env.DEBUG_PAGE || process.env.DEBUG_PAGE !== 'true') {
        tradingBot.startWebhook(`/${secretPath}`, telegram.host, telegram.defaultPort);
        await tradingBot.launch();
        startUpServer();
    }
}
catch (err) {
    console.log(err);
    console.log('error starting telegram bot server ');
}

// Enable graceful stop
process.once('SIGINT', () => {
    try {
        dataSource.close();
        strategyClient.ws.close();
    } catch (err) {

    }
    return tradingBot.stop('SIGINT');
})
process.once('SIGTERM', () => {
    try {
        dataSource.close();
        strategyClient.ws.close();
    } catch (err) {

    }
    return tradingBot.stop('SIGTERM');
});

export default tradingBot;

function setKeybordFromStatus(status) {
    let keyboard = mainKeyboard;
    if (!status || status == 'INIT' || status === 'STOP') {
        keyboard = stopKeyborad;
    }

    if (status === 'START') {
        keyboard = startKeyboard;
    }

    if (status === 'PAUSE') {
        keyboard = pauseKeyboard;
    }

    currentKeyborad = keyboard;

    return keyboard;
}
