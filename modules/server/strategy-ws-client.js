import WebSocket from 'ws';
import { Console as console } from '../logger-mod.js';
import { enviorments } from '../properties-mod.js';

const { websocketEnv } = enviorments();

export const strategyClient = {
    ws: null,
    opened: false,
    reconnection: 0
};

export const strategyWs = {
    /**
     * Sii connette al web server socker
     * @returns {WebSocket} websocker client
     */
    connect: () => { },
    client: strategyClient,
    /**
     * Hook che Riceve i messaggi dal server
     * @param {WebSocket} ws 
     * @param {any} data 
     */
    reciver: async (ws, data) => { },
    /**
     * Hook che si aggancia all'apertura della connessione
     * @param {WebSocket} ws 
     */
    onopenhook: async (ws) => { },
    /**
     * Hook che si aggancia quando si verificano errori
     */
    onerrorhook: async () => { },
    /**
     * Hook che si aggancia alla cjiusura della caonnesione
     */
    onclosehook: async () => { }
}

const reconnect = () => {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                strategyWs.connect();
                strategyClient.reconnection++;
                resolve();
            }, 1000);
        }
        catch (err) {
            reject();
        }
    });
}
/**
 * Si connete al server della strategia
 * @returns {WebSocket} WebSocket
 */
strategyWs.connect = () => {
    const wsc = new WebSocket(`ws://${websocketEnv.server}:${websocketEnv.port}${websocketEnv.path}`);


    wsc.onopen = async () => {
        try {
            strategyClient.opened = true;
            strategyClient.ws = wsc;
            strategyClient.reconnection = 0;
            console.log('strategy socket connected');
            await strategyWs.onopenhook(wsc);
        } catch (err) {
            console.error(err);
        }
    };

    wsc.onclose = async () => {
        strategyClient.opened = false;
        await strategyWs.onclosehook();
        try {
            // prova a ricconetterti
            if (strategyClient.reconnection <= websocketEnv.maxretry) {
                await reconnect();
            } else {
                console.log('max connection retry exceed');
            }
        }
        catch (err) {
            console.error(err);
        }
    };

    wsc.onerror = async (err) => {
        strategyClient.opened = false;
        await strategyWs.onerrorhook();
        try {
            console.log('error, ', err);
            if (strategyClient.reconnection <= websocketEnv.maxretry) {
            } else {
                console.log('max connection retry exceed');
            }
        } catch (err) {
            console.error(err);
        }
    };

    wsc.onmessage = async (data) => {
        try {
            const message = JSON.parse(data.data);
            await strategyWs.reciver(wsc, message);
        }
        catch (err) {
            console.error(err);
        }
    };

    return wsc;
};