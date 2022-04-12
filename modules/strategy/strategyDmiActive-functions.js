import { cancelAllOrders } from './global-function.js';
import { checkOrderTriggered, CalculateAndInsertProtections, closePositionCancelAllOrdersAndReset, cancelAllOrdersAndReset, CalculateProfit } from './strategy-functions.js';
import { strategySessions } from '../strategy-mod.js';
import { timerTPOrder, stopAllTimers } from './TimerTask.js';
import { Console as console } from '../logger-mod.js';

export async function DmiActive() {
    
    // è la prima volta che entra in questo ciclo e non ci rientra più a meno che non si riattivi la variabile globale strategySessions.OutDmiIntervalActive == false
    if (!strategySessions.OutDmiIntervalActive) {
        // variabile globale che indica se almeno una volta si è entrati in questo ciclo
        strategySessions.OutDmiIntervalActive = true;

        // qui c'è la position aperta
        if (strategySessions.positionInfo.entryPrice > 0) {
            
            await stopAllTimers();
            strategySessions.orderTriggered = await checkOrderTriggered();

            // unrealizedPnL <= 0
            if (strategySessions.positionInfo.unrealizedPnL <= 0) {
                await CalculateProfit ("Out DMI unrealizedPnL <= 0");
                await closePositionCancelAllOrdersAndReset("close for DMI exit range and Unrealized profit <= 0");
                console.debug("entrato nel ciclo out DMI e rilevato unrealizedPnL <= 0", strategySessions.positionInfo.unrealizedPnL);
            }

            // unrealizedPnL > 0
            else {
                await CalculateProfit ("Out DMI unrealizedPnL > 0");
                console.debug("entrato nel ciclo out DMI e rilevato unrealizedPnL > 0", strategySessions.positionInfo.unrealizedPnL);

                if (strategySessions.orderTriggered >= 0) {

                    // questa variabile viene settata a true sono per fare entrare il ciclo onTimerDmi nel settaggio delle protection stretto
                    strategySessions.dmiTriggered = true;
                    await onTimerOutDmi(strategySessions.settings, "Out DMI: orders cancelled and protection inserted !");
                    timerTPOrder.playFromStart();
                }
            }
        }
        // qui non c'è la position aperta
        else {
            await CalculateProfit("Out DMI entryPrice = 0");
            await cancelAllOrdersAndReset("Out DMI with entryPrice == 0");
        }
    }
}

async function onTimerOutDmi(settings,logmessage) {
    strategySessions.lastResetTime = (new Date()).getTime();
    await cancelAllOrders();
    strategySessions.protectionInserted = false;
    strategySessions.TPOrderInserted = false;
    await CalculateAndInsertProtections(settings);
    console.debug(logmessage);

}
