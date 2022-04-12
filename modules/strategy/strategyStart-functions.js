
import { checkActive2, checkStartLevel, CalculateAndInsertOpenOrdersAtStart, calculateBalance, checkOpen } from './strategy-functions.js';
import { strategyCore } from './strategyCore.js';
import { DmiActive } from './strategyDmiActive-functions.js';
import { strategySessions } from '../strategy-mod.js';
import emoji from 'node-emoji';
import { Console as console } from '../logger-mod.js';
import { sendMessage, cancelAllOrders, insertPartialClose } from './global-function.js';

export async function onStart(settings,dmxIndicator,bDmiSize) {
    if(strategySessions.balance <= 0 ){
        strategySessions.balance = await calculateBalance();
    }

    strategySessions.active2 = checkActive2(settings, dmxIndicator, bDmiSize);
    
    if (!strategySessions.statusSTARTActive) {

        //if (strategySessions.positionInfo.entryPrice == 0 && strategySessions.currentOrders.length == 0) {         
        
            if (strategySessions.active2) {

                // viene settato a true quando passa ad una nuova candela, e a false se viene preso un TP o SL
                if (strategySessions.active4) {

                    // viene settato a true di default e diventa false tramite la funzione startkCount() che lo lascia false per stopBotFor candele                        
                    if (strategySessions.active5) {
                        strategySessions.statusSTARTActive = true;
                        strategySessions.statusPAUSEActive = false;
                        strategySessions.statusSTOPActive = false;

                        // chiude tutti gli openOrders prima di ripartire
                        if (strategySessions.openOrders.length > 0) {
                            strategySessions.lastResetTime = (new Date()).getTime();
                            await cancelAllOrders();
                            strategySessions.protectionInserted = false;
                            strategySessions.TPOrderInserted = false;
                        }

                        // chiude la position prima di ripartire
                        if (strategySessions.positionInfo.entryPrice > 0) {
                            strategySessions.lastResetTime = (new Date()).getTime();
                            await insertPartialClose(100);
                        }

                        /* questa funzione stima a che livello si sta decidendo di partire:
                        livello 0 -> tra il 1° livello buy e 1° livello sell
                        livello 1 -> tra il 1° livello e 2° livello
                        livello 2 -> tra il 2° livello e 3° livello
                        livello 3 -> al 3° livello
                        */
                        if (strategySessions.openOrders.length == 0 && strategySessions.positionInfo.entryPrice == 0) {
                            strategySessions.SLClosed = false;
                            strategySessions.TPClosed = false;
                            strategySessions.midBollLossTriggered = false;
                            await checkStartLevel(settings);
                            strategySessions.startTime = (new Date()).getTime();
                            const started = await CalculateAndInsertOpenOrdersAtStart(settings);
                            
                            console.debug("start status level: ",strategySessions.startLevel);
                            if(!started){
                                strategySessions.statusSTARTActive = false;
                                console.debug("error inserting start orders, strategySessions.statusSTARTActive: ",strategySessions.statusSTARTActive);
                                return;
                            }
                        }
                        else {
                            sendMessage(strategySessions.chatId, `${emoji.emoji.bowtie} ${emoji.emoji.bowtie} the strategy is starting but there are still orders present, STOP and START again to solve this issue...`);
                        }
                    }
                }
            }

            // il DMI è fuori dal range direttamente dallo START per cui non permette di inserire neanche gli ordini di START
            else {
                if (!strategySessions.messageSent_9) {
                    strategySessions.messageSent_9 = true;
                    sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} the bot will start when all ${settings.stopBotFor} last candels will be back in range...`);
                }
            }
        //}
    }

    //strategySessions.statusSTARTActive == true buol dire che è entrato un ordine
    else {

        // qui siamo dentro le bande di confidenza dell'indicatore DMI 
        if (strategySessions.active2) {
            if (strategySessions.OutDmiIntervalActive) {
                strategySessions.OutDmiIntervalActive = false;
                //strategySessions.lastResetTime = (new Date()).getTime();
            }
            await strategyCore(settings);
        }

        /* qui è uscito fuori dalle bande di confidenza dell'indicatore DMI ed una volta uscito
        la variabile strategySessions.active2 sarà false fino a quando le ultime stopBot candele
        non saranno tutte le range prestabilito
        */   
        else {
           await DmiActive();
        }
    }
}