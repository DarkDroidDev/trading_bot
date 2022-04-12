import { cancelAllOrders, sendMessage } from './global-function.js';
import { strategySessions } from '../strategy-mod.js';
import { checkOrderTriggered, variableReset, CalculateAndInsertProtections } from './strategy-functions.js';
import emoji from 'node-emoji';
import { stopAllTimers } from './TimerTask.js';
import { Console as console } from '../logger-mod.js';

export async function onPause() {

    if (!strategySessions.statusPAUSEActive) {

        strategySessions.statusPAUSEActive = true;

        if (strategySessions.positionInfo.entryPrice > 0) {

            sendMessage(strategySessions.chatId, `Strategy PAUSED, ${emoji.emoji.zzz} Take Profit protection and all open orders will be deleted and your position kept active with Stop Loss inserted`);
            strategySessions.orderTriggered = await checkOrderTriggered();
            await stopAllTimers();

            if (strategySessions.orderTriggered >= 0) {
                
                await onTimerPause(strategySessions.settings,"pause: orders cancelled and only SL inserted !");
            }
        }
        else {
            sendMessage(strategySessions.chatId, `Strategy PAUSED, ${emoji.emoji.zzz} all open orders will be deleted`);
            strategySessions.lastResetTime = (new Date()).getTime();
            await cancelAllOrders();
            await variableReset();
        }
    }   
}

// funzione che calcola lo SL e lo aggiornano continuamente mentre si è in status = PAUSE
 async function onTimerPause(settings,logmessage) {
    strategySessions.lastResetTime = (new Date()).getTime();
    await cancelAllOrders();
    strategySessions.protectionInserted = false;
    strategySessions.TPOrderInserted = false;
    await CalculateAndInsertProtections(settings);
    console.debug(logmessage);
 }
