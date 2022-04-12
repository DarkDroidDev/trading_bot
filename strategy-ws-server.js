///////////////////////////////////////////////////////////////////////
//////////  SERVER WEBSOCKET DELLA STRATEGIA
/////////  ////////////////////////////////// ///////////////////////
import emoji from 'node-emoji';
import { WebSocketServer } from 'ws';
import BinanceTrading from './modules/binance-client.js';
import { enviorments } from './modules/properties-mod.js';
import { authCodesRepo } from './repository/authcodes-repository.js';
import { settingsRepo } from './repository/settings-repository.js';
import { Console as console } from "./modules/logger-mod.js";
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);

const {version} =  require("./package.json");

const { websocketEnv } = enviorments();

const accountSession = {
    bInstance: null,
    symbol: '',
    settingsLoaded: false,
    attached: false,
    binanceConnected: false,
    chat: null,
    status: '',
    pendingDetach: false
}

/// instanzia il server websocket
const wss = new WebSocketServer({
    port: websocketEnv.port,
    host: websocketEnv.server,
    path: websocketEnv.path
}
);

/**
 * Hook dei messaggi websocket
 * 
 * @param {WebSocket} ws 
 * @param {*} data 
 */
const serverWSReceivedMessagesHook = async (data) => {
    const recivedData = JSON.parse(data);

    if (recivedData && recivedData.cmd) {
        // const chatId = recivedData.chatId;
        // const from = recivedData.from;

        // ricarica i settings
        await setupPair();
        await loadSettings(accountSession.symbol);

        if (!accountSession.binanceConnected) {
            await onStrategyMessageToTelegram(`Server is not connected`);
            return;
        }

        switch (recivedData.cmd) {

            // evento inviato quando il bot è in started
            case 'session_request_for_start':
                // FASE 1: Verifica se la sessione e' ancora su
                if (accountSession.status !== "START") {
                    if (accountSession.attached) {
                        changeStatus('START');
                    } else {
                        // ottieni il symbol dai settings del db
                        accountSession.attached = true;
                        // aggancia la strategia e dopo invia lo astatus START
                        accountSession.bInstance.runStrategy();
                    }

                    accountSession.status = "START";
                    updateSessionInfoToTelegram();
                }
                break;
            case 'bot_started':
                // invia i dati della sessione
                updateSessionInfoToTelegram();
                break;

            // invia il comando di pause
            case 'pause_strategy':

                if (accountSession.attached && accountSession.status !== 'PAUSE') {
                    changeStatus('PAUSE');
                    accountSession.status = "PAUSE";

                    updateSessionInfoToTelegram();
                }
                break;

            // invia il comando di stop
            // case 'stop_strategy':
            //     if (accountSession.attached && accountSession.status !== 'STOP') {
            //         changeStatus('STOP');
            //         accountSession.status = "STOP";

            //         updateSessionInfoToTelegram();
            //     }
            //     break;
            case 'change_settings':
                await setupPair();
                await loadSettings(accountSession.symbol);
                updateSessionInfoToTelegram();
                accountSession.bInstance.postCommand({
                    msg: 'change_settings',
                    chatId: accountSession.chat.id,
                    pair: accountSession.symbol
                });
                break;
            case 'stop_strategy':
            case 'detach_graph_and_stop':
                if (accountSession.attached) {
                    accountSession.pendingDetach = true;
                    changeStatus('STOP');
                    accountSession.status = "STOP";
                   
                    await setupPair();
                    await loadSettings(accountSession.symbol);
                    updateSessionInfoToTelegram();
                }

                await onStrategyMessageToTelegram(`${emoji.emoji.raised_hand} Wait while graph stop....`);
                if (!accountSession.attached) {
                    await onStrategyMessageToTelegram(`${emoji.emoji.raised_hand} Strategy graph was stopped`);
                }
                break;
        }
    }
}

const changeStatus = (status) => accountSession.bInstance.postCommand({
    msg: 'telegram',
    chatId: accountSession.chat.id,
    tgStatus: status,

});

const detachPair=() => accountSession.bInstance.postCommand({
    cmd: 'detach',
    chatId: accountSession.chat.id
})
/**
 * Callback dell'evento READY emesso dal grafico della strategia
 * 
 * @param {Number} chatId 
 */
const onStrategyReady = async () => {
    // setta lo status a start
    accountSession.status = 'START';
    accountSession.attached = true;

    try {
        changeStatus('START');
        await onStrategyMessageToTelegram(`${emoji.emoji.up} The Strategy has been Started ${emoji.emoji.up}`);
        updateSessionInfoToTelegram();
    } catch (err) {
        console.error(err);
    }
}

const onStrategyCompleteStop = async () => {
    if (accountSession.pendingDetach) {
        accountSession.status = 'STOP';
        detachPair();
        accountSession.attached = false;
        accountSession.pendingDetach = false;
        await onStrategyMessageToTelegram(`${emoji.emoji.raised_hand} Strategy graph was stopped`);
        updateSessionInfoToTelegram();
    }
}
/**
 * Evento emesso oquando la strategia si chiude
 * @param {Number} chatId 
 */
const onStrategyClosed = async () => {
    accountSession.status = 'STOP';
    accountSession.attached = false;
    await onStrategyMessageToTelegram('The strategy server is down');
}

const serverWSClosedHook = async () => {
}

const serverWSErrorHook = async (ws, error) => {
    accountSession.binanceConnected = false;
    wss.clients.forEach(async (ws) => {
        updateSessionInfoToTelegram();
        await onStrategyMessageToTelegram(`${emoji.emoji.face_with_rolling_eyes}${emoji.emoji.face_with_rolling_eyes} error occured on strategy server ${error.message}`);
    });
}

/**
 * Carica i settings base per il pair
 * 
 * @param {string} lastUsedPair 
 */
const loadSettings = async (lastUsedPair) => {

    console.debug(`update binance account information`);
    await accountSession.bInstance.getDefaultCurrencyFromAccount();

    console.debug(`found this pair ${lastUsedPair}`);
    await accountSession.bInstance.loadSettings(lastUsedPair);

    console.debug(`settings for symbol ${lastUsedPair} has been loaded`);
    await accountSession.bInstance.loadSymbolSettings(lastUsedPair);

    // invia il leverage
    await accountSession.bInstance.client.futuresLeverage(lastUsedPair, accountSession.bInstance.settings.levaMax);

    accountSession.symbol = lastUsedPair;
    accountSession.settingsLoaded = true;
    accountSession.binanceConnected = true;
}

/**
 * Aggancia gli eventi del server
 * 
 * @param {WebSocker} ws 
 */
const awaitClientConnections = (ws) => {
    ws.on("message", async (data) => {
        try {
            await serverWSReceivedMessagesHook(data);
        } catch (err) {
            console.error(err);
        }
    });

    ws.on("close", async () => {
        console.debug("the client has disconnected");
        try {
            await serverWSClosedHook();
        } catch (err) {
            console.error(err);
        }
    });
    // handling client connection error
    ws.onerror = async () => {
        console.error("Some Error occurred");
        try {
            await serverWSErrorHook();
        } catch (err) {
            console.error(err);
        }
    };
}

/**
 * Verifica la connessione al server di binance
 * 
 * @returns {boolean}
 */
const checkBinanceConnection = async (ws) => {
    try {
        const time = await accountSession.bInstance.client.time();
        const dTime = new Date(time.serverTime);
        console.debug(`current binance server time ${dTime.toLocaleDateString()} ${dTime.toLocaleTimeString()}`);
        accountSession.binanceConnected = true;
    }
    catch (err) {
        console.error(err);
        console.debug('connection error');
        accountSession.binanceConnected = false;
        await onStrategyMessageToTelegram(`Ops unable connect to Binance server check the network or retry later `)
    }

    return accountSession.binanceConnected;
}
//////////////////// TELEGRAM MESSAGES////////////////////////////////////
/**
 * Invia il messaggio al bot di telegram
 * 
 * @param {Number} mChatId 
 * @param {String} message 
 */
const onStrategyMessageToTelegram = async (message) => {
    try {
        if (message) {
            wss.clients.forEach((ws) => {
                try {
                    ws.send(JSON.stringify({
                        msg: 'strategy_messages',
                        message
                    }));
                } catch (err) {
                    console.error(err);
                }
            });

            return true;
        }
    } catch (err) {
        console.error(err);
    }
    return false;
}

/**
 * Imposta il pair ottenendolo dal db
 */
async function setupPair() {

    let result = false;
    try {
        const defaultAccount = await authCodesRepo.findDefaultAccount();

        if (!!defaultAccount.lastUsedPair && defaultAccount.lastUsedPair !== accountSession.symbol) {
            accountSession.symbol = defaultAccount.lastUsedPair;
            result = true;
        } else {
            // ottieni il symbolo dai settings il primo della lista
            const settingsData = await settingsRepo.model.findOne({ chatId: defaultAccount.chatId });

            if (!!settingsData) {
                accountSession.symbol = settingsData.pair;
                result = true;
            } else {
                console.error(`No settings pair is configurated`)
            }
        }
    } catch (err) {
        console.error(err);
    }
    return result;
}

/**
 * 
 * @param {*} ws 
 * @param {*} chatId 
 * @param {*} from 
 */
function updateSessionInfoToTelegram() {
    try {
        if (wss.clients.size > 0) {
            wss.clients.forEach((ws) => {
                ws.send(JSON.stringify({
                    cmd: 'session_info',
                    data: {
                        chatId: accountSession.chat.id,
                        settingsLoaded: accountSession.settingsLoaded,
                        attached: accountSession.settingsLoaded,
                        symbol: accountSession.symbol,
                        binanceConnected: accountSession.binanceConnected,
                        status: accountSession.status
                    }
                }));
            });
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * 
 * @param {WebSocket} ws 
 */
const main = async (ws) => {
    try {
        /// 1: cerca l'account nel db l'account di default
        const defaultAccount = await authCodesRepo.findDefaultAccount();

        /// 2.a l'account viene trovato
        if (defaultAccount && defaultAccount.chatId) {

            // account trovato verifica se esiste un pair di default
            const chat = {
                id: defaultAccount.chatId
            }

            // inizializza l'instanza
            if (!accountSession.bInstance) {
                accountSession.bInstance = new BinanceTrading(chat);
                accountSession.bInstance.on('STRATEGY_MESSAGES', onStrategyMessageToTelegram.bind(this));
                accountSession.bInstance.on('STRATEGY_READY', onStrategyReady.bind(this));
                accountSession.bInstance.on('STRATEGY_CLOSED', onStrategyClosed.bind(this));
                accountSession.bInstance.on('STRATEGY_COMPLETE_STOP', onStrategyCompleteStop.bind(this));
            }

            console.debug(`binance account is set to ${defaultAccount.chatId}`);
            accountSession.chat = chat;

            let bIsConfOk = await setupPair(ws);

            if (!bIsConfOk) {
                await onStrategyMessageToTelegram(`problem in configuration check settings and auth codes`);
                return;
            }
            // check connectivity with binance server
            checkBinanceConnection(ws);
            awaitClientConnections(ws);
            
            await onStrategyMessageToTelegram(`${emoji.emoji.electric_plug} connected to version ${version} !!`);
            updateSessionInfoToTelegram();
        }
        else {
            // invia un messaggio al bot che c'e' un problema di configurazione dell'account
            ws.send(JSON.stringify({
                msg: 'configuration_error',
                text: 'default binance account is not found'
            }));

            await onStrategyMessageToTelegram(`Wrong configuration for bot, default account is missing ${emoji.emoji.small_red_triangle}${emoji.emoji.small_red_triangle}`);
        }
    } catch (err) {
        console.error(err);
    }
}


wss.on('error', async (err, ws) => {
    console.error('server error ', err);
    await serverWSErrorHook(ws, error);
});

// Creating connection using websocket
wss.on("connection", async ws => {
    try {
        await main(ws);
    } catch (err) {
        console.error(err);
    }
});

wss.on('listening', (data) => {
    console.info('#############################################################');
    console.info('############## STRATEGY BOT SERVER ##########################');
    console.info('#############################################################');
    console.info('');
    console.info('listening on port: ', websocketEnv.port);
    console.info('listening on path: ', websocketEnv.path);
    console.info('listening on host: ', websocketEnv.server);
    console.info('listening on host: ', websocketEnv.server);
    console.info('');
    console.info(`################### ${process.env.NODE_ENV} ###########################`);
});
