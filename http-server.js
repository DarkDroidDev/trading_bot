import express from "express";
import helmet from "helmet";
import compress from 'compression';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import { enviorments } from "./modules/properties-mod.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { strategyWs } from "./modules/server/strategy-ws-client.js";
import tradingBot, { onReciveCmdFromStrategy } from "./modules/telegram-trading-bot-mod.js";
import { sentMessageToAll } from "./modules/utilitiies-mod.js";
import bodyParser from 'body-parser';
import { createRequire } from "module";
import { settingsRepo } from "./repository/settings-repository.js";
import BinanceTrading from "./modules/binance-client.js";
import CheckOrigin from "./middleware/check-origin.js";
import HeadersCheck from "./middleware/headers-check.js";
import jwt from 'jsonwebtoken';
import { authCodesRepo } from "./repository/authcodes-repository.js";
import { Console as console } from "./modules/logger-mod.js";
import { ContainerManager } from "./modules/server/server-management-services.js";

// versione 0.1.207
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { httpLocalserver, sessionName } = enviorments();

const version = require("./package.json").version;

const app = express(); // create express app
// carica la configurazione del server
if(!process.env.DEBUG_PAGE || process.env.DEBUG_PAGE !== 'true'){
    // connetti al websocket della strategia
    strategyWs.connect();
}

console.info(`application version: ${version}`);

//// verifica headers e cors
app.use(CheckOrigin.cors);
app.use(HeadersCheck.check);

app.use(compress());

app.use(express.static(httpLocalserver.serverPath));

app.use(helmet());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
    ExpressMongoSanitize({
        onSanitize: ({ req, key }) => {
            console.warn(`This request[${key}] is sanitized`, req);
        },
    }),
);

app.get('/time', (req, resp) => {
    const time = new Date().getTime();
    resp.status(200).json({
        msg: 'ok',
        data: time
    })
});
/**
 * Ottiene la lista dei settings a partire dal chatid
 * Se non vine specificato il chat id allora ottine tutti i settings
 * 
 */
app.get(['/settings/list', '/settings/list/:chatId'], async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;


        if (chatId && chatId !== -1 && chatId != req.authUser) {
            return resp.status(401).json({
                error: 401,
                msg: 'operation not allowed'
            }).end();
        }
        let listSettings = null;
        if (chatId > 0 && !isNaN(chatId)) {
            listSettings = await settingsRepo.model.findOne({ chatId });
        }
        else {
            const defaultAccount = await authCodesRepo.findDefaultAccount();
            if (defaultAccount) {
                let defaultPair = defaultAccount.lastUsedPair;
                if (defaultPair) {
                    listSettings = await settingsRepo.model.findOne({ chatId: defaultAccount.chatId });

                    if (!listSettings || !listSettings._id) {
                        // carica i settings di default
                        listSettings = getDefaultSettings(chatId);
                    }
                }
            } else {
                // carica i settings di default
                listSettings = getDefaultSettings(chatId);
            }

        }

        if (listSettings && listSettings.chatId) {
            return resp.status(200).json({
                msg: 'ok',
                data: listSettings
            }).end();
        }
        else {
            return resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            }).end();
        }
    }
    catch (err) {
        return resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        }).end();
    }
});

app.get('/settings/default', async (req, resp) => {
    try {
        let listSettings = getDefaultSettings(chatId);
        return resp.status(200).json({
            msg: 'ok',
            data: listSettings
        });
    }
    catch (err) {
        console.error(err);
        return resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});
/**
 * Ottiene i settings per un singolo pair
 */
app.get('/settings/:chatId/:symbol', async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        const symbol = req.params.symbol;

        let listSettings = [];
        if (chatId > 0 && !isNaN(chatId) && !!symbol) {
            listSettings = await settingsRepo.model.findOne({ chatId, pair: symbol });
        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters'
            })
        }

        if (listSettings && listSettings._id) {
            resp.status(200).json({
                msg: 'ok',
                data: listSettings
            });
        }
        else {
            resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

app.get('/symbols/:chatId', async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        let listSymbols = [];

        if (chatId > 0 && !isNaN(chatId)) {
            listSymbols = await getSymbolsListFromBinance(chatId);
        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters'
            })
        }

        if (listSymbols && listSymbols.length > 0) {
            resp.status(200).json({
                msg: 'ok',
                data: listSymbols
            });
        }
        else {
            resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

app.post('/settings/edit/:stopStrategy', async (req, resp) => {
    try {
        const settings = req.body;
        const stopStrategy = req.params.stopStrategy === 'true' || req.params.stopStrategy === true;
        try {
            if (stopStrategy) {
                // invia stop della strategia
                strategyWs.client.ws.send(JSON.stringify({
                    cmd: 'stop_strategy'
                }));
            }
        }
        catch (err) {
            console.error(err);
        }

        if (!!settings && settings.pair && settings.chatId) {

            let listSymbols = await getSymbolsListFromBinance(settings.chatId);

            if (listSymbols && (listSymbols.length == 0 || listSymbols.findIndex((v) => v == settings.pair) !== -1)) {

                const result = await settingsRepo.model.updateOne({ chatId: settings.chatId }, { $set: settings });

                if (result && (result.upsertedCount > 0 || result.modifiedCount > 0)) {
                    try {

                        try {
                            if (stopStrategy) {
                                // invia stop della strategia
                                strategyWs.client.ws.send(JSON.stringify({
                                    cmd: 'detach_graph_and_stop'
                                }));
                            }
                        }
                        catch (err) {
                            console.error(err);
                        }

                        // salava anche nel currentPait
                        const resultCurrentUsed = await authCodesRepo.model.updateOne({ chatId: settings.chatId }, { $set: { lastUsedPair: settings.pair } });
                        if (resultCurrentUsed && (resultCurrentUsed.modifiedCount > 0 || resultCurrentUsed.upsertedCount > 0)) {
                            console.debug('ok lastUsedPair updated');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                    try {
                        if (!stopStrategy) {
                            strategyWs.client.ws.send(JSON.stringify({
                                cmd: 'change_settings',
                                pair: settings.pair
                            }));
                        }
                    } catch (errr) {
                        console.error(err);
                    }
                    resp.status(200).json({
                        msg: 'ok',
                        data: settings
                    });
                } else {
                    resp.status(200).json({
                        msg: 'ok',
                        data: settings
                    });
                }
            }
            else {
                resp.status(404).json({
                    error: 404,
                    msg: 'Missing symbol'
                });
            }
        }
        else {
            resp.status(405).json({
                error: 405,
                msg: 'Missing request parameters'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

app.delete('/settings/:chatId/:symbol', async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        const symbol = req.params.symbol;

        let listSettings = [];
        if (chatId > 0 && !isNaN(chatId) && !!symbol) {
            listSettings = await settingsRepo.model.findOne({ chatId, pair: symbol });
        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters'
            })
        }

        if (listSettings && listSettings._id) {
            // elimina dal db
            const result = await settingsRepo.model.deleteOne({
                chatId,
                pair: symbol
            });

            if (result && result.deletedCount > 0) {
                resp.status(200).json({
                    msg: 'ok',
                    data: true
                });
            } else {
                resp.status(405).json({
                    error: 405,
                    msg: 'Delete error'
                });
            }
        }
        else {
            resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

/**
 * genera un token jwt necessario a chiamare le api
 */
app.post('/signin/token/:chatId/:code', async (req, resp) => {
    try {
        const chatId = req.params.chatId;
        const code = req.params.code;
        const dbChat = await authCodesRepo.model.findOne({ chatId });

        if (dbChat && dbChat.code && dbChat.code == code) {
            const token = await generateAccessToken(chatId);

            // rimuovi il codice
            dbChat.code = '';

            await authCodesRepo.model.updateOne({ chatId }, { $set: dbChat });
            return resp.status(200).json({
                msg: 'ok',
                data: token,
                username: dbChat.username
            });
        } else {
            return resp.status(401).json({
                error: 401,
                msg: 'User is not allowed'
            });
        }
    }
    catch (err) {
        console.error(err);
        return resp.status(500).json({
            error: 500,
            msg: 'Server error'
        })
    }
});

/**
 * genera un token jwt necessario a chiamare le api
 */
app.post('/signin/token/:code', async (req, resp) => {
    try {
        let chatId = -1;
        const code = req.params.code;
        const dbChat = await authCodesRepo.model.findOne({ code });

        if (dbChat && dbChat.code && dbChat.code == code) {
            chatId = dbChat.chatId;
            const token = await generateAccessToken(chatId);

            // rimuovi il codice
            dbChat.code = '';

            await authCodesRepo.model.updateOne({ chatId }, { $set: dbChat });
            return resp.status(200).json({
                msg: 'ok',
                data: {
                    token, chatId,
                    username: dbChat.username
                }
            });
        } else {
            return resp.status(401).json({
                error: 401,
                msg: 'User is not allowed'
            });
        }
    }
    catch (err) {
        console.error(err);
        return resp.status(500).json({
            error: 500,
            msg: 'Server error'
        })
    }
});

/**
 * genera un token jwt necessario a chiamare le api
 */
app.post('/signin/token/:chatId', async (req, resp) => {
    try {
        const chatId = req.params.chatId;
        const token = await generateAccessToken(chatId);

        resp.status(200).json({
            msg: 'ok',
            data: token
        })
    }
    catch (err) {
        console.error(err);
        resp.status(500).json({
            error: 500,
            msg: 'Server error'
        })
    }
});

/**
 * Restart server
 */
app.post('/server/restart/:chatId',async (req, resp)=>{
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        let account = null;
        if (chatId > 0 && !isNaN(chatId)) {
            account = await authCodesRepo.model.findOne({ chatId });
        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters'
            })
        }

        if (account && account.chatId && account.chatId > 0) {
            const containerManager = new ContainerManager();
            const resultRestart = await containerManager.restartContainers();

            resp.status(200).json({
                msg: resultRestart ? 'ok': 'error',
                data: resultRestart
            });
            
        }
        else {
            resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

app.get('/account/:chatId', async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        let account = null;
        if (chatId > 0 && !isNaN(chatId)) {
            account = await authCodesRepo.model.findOne({ chatId });
        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters'
            })
        }

        if (account && account.chatId && account.chatId > 0) {
            resp.status(200).json({
                msg: 'ok',
                data: account
            });
        }
        else {
            resp.status(404).json({
                error: 404,
                msg: 'no settings found'
            });
        }
    }
    catch (err) {
        resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});

app.post('/account/:chatId', async (req, resp) => {
    try {
        const chatId = !!req.params.chatId ? req.params.chatId : -1;
        const body = req.body;
        let account = null;

        if (!body || !body.binanceKey || !body.binanceSecret) {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters missing body'
            })
        }

        if (chatId > 0 && !isNaN(chatId)) {
            account = await authCodesRepo.model.findOne({ chatId });

            if (!account || !account._id) {
                return resp.status(405).json({
                    error: 404,
                    msg: 'account not found'
                })
            }

            // salva i dati
            const resultSave = await authCodesRepo.model.updateOne({ chatId }, {
                $set: {
                    binanceApiKey:  body.binanceKey.trim(),
                    binanceSecret: body.binanceSecret.trim(),
                    binanceTestnet: body.binanceTestnet
                }
            });

            if (resultSave && (resultSave.matchedCount > 0 || resultSave.modifiedCount > 0)) {
                strategyWs.client.ws.send(JSON.stringify({
                    cmd: 'stop_strategy'
                }));

                return resp.status(200).json({
                    msg: 'ok',
                    data: true
                });

            } else {
                strategyWs.client.ws.send(JSON.stringify({
                    cmd: 'stop_strategy'
                }));
                return resp.status(200).json({
                    msg: 'no-changes',
                    data: true
                });

            }


        }
        else {
            return resp.status(405).json({
                error: 405,
                msg: 'wrong parameters missing chatiId'
            })
        }
    }
    catch (err) {
        return resp.status(500).json({
            error: 500,
            msg: 'Server Error'
        });
    }
});
/// rendirizza tutte le richieste sul file html
app.get('**', (req, resp) => {
    resp.sendFile(path.join(__dirname, httpLocalserver.serverPath, 'index.html'));
});

app.listen(httpLocalserver.port, () => {
    console.info("http server started on port " + httpLocalserver.port);
    console.info('env is ', sessionName);
})
.on('close', async () => {
    console.info('server is closed');
})
.on("clientError", async (e) => {
    console.info('server client error occurred');
    console.error(e);
    console.info('///////////////////////////');
})
.on("error", async (e) => {
    console.info('server error occurred');
    console.error(e);
    console.info('///////////////////////////');
});

/////////////////////////////////////////////////////////////////////
/// gestistisce la ricezione dei messaggi ws 
///////////////////////////////////////////////////////////////////
strategyWs.reciver = async (wsc, recivedData) => {

    try {
        if (recivedData) {
            if (recivedData.msg) {
                /// errore nella configurazione della tabella authcodes
                if (recivedData.msg == 'configuration_error') {
                    sentMessageToAll(tradingBot, 'Ops can\'t find default binance account check configuration');
                    console.error('missing default user in authcodes table');
                    return;
                }

                if (recivedData.msg == 'reply_instance_active') {
                    const chatId = recivedData.chatId;
                    if (chatId == -1) {
                    }
                    return;
                }

                switch (recivedData.msg) {

                    case "strategy_messages":
                        sentMessageToAll(tradingBot, recivedData.message);
                        break;
                    default:
                        break;
                }
            } else if (recivedData.cmd) {
                /// comandi provenienti dal client websocket
                onReciveCmdFromStrategy(recivedData);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function getDefaultSettings(chatId) {
    let listSettings;
    try {
        const bInstance = new BinanceTrading({
            chatId: chatId
        });

        listSettings = bInstance.settings;
        listSettings.chatId = chatId;
    } catch (err) {
        console.error(err);
    }
    return listSettings;
}

/**
 * Ottiene la lista dei simboli disponibili
 * @param {Number} chatId 
 * @returns {String[]}
 */
async function getSymbolsListFromBinance(chatId) {
    let listSymbols = [];
    try {
        const bInstance = new BinanceTrading({
            id: chatId
        });

        const exInfo = await bInstance.client.exchangeInfo();

        if (exInfo && exInfo.symbols) {
            listSymbols = exInfo.symbols.map(({ symbol }) => symbol);
        }
    } catch (err) {
        console.error(err);
    }
    return listSymbols;
}
/**
 * Genera il token che verra utilizzato per l'accesso al servizio
 * @param {Number} chatId 
 * @returns 
 */
async function generateAccessToken(chatId) {
    try {

        const dateNow = (new Date()).getTime() + (Number(process.env.HTTP_SERVER_TOKEN_EXPIRE) * 1000);
        return jwt.sign({
            exp: dateNow,
            chatId
        }, process.env.HTTP_SERVER_TOKEN_SECRET, {
            algorithm: "HS512"
        });
    } catch (err) {
        console.error(err);
    }
}
