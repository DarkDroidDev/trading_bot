import { cancelAllOrders, insertPartialClose } from './global-function.js';
import { strategySessions, completeStop } from '../strategy-mod.js';
import { CalculateProfit, variableReset } from './strategy-functions.js';
import { Console as console } from '../logger-mod.js';

export async function onStop() {

   if (!strategySessions.statusSTOPActive) {

      strategySessions.statusSTOPActive = true;

      console.debug(`position closed by user`);
      strategySessions.positionAmountBeforePartialClose = strategySessions.positionInfo.positionAmount;
      strategySessions.lastResetTime = -1;
      await CalculateProfit("Position closed by user");
      
      if (strategySessions.positionInfo.entryPrice > 0) {
         await insertPartialClose(100);
      }
      await cancelAllOrders();
      await variableReset();
      strategySessions.statusSTOPActive = true;
      
      setTimeout(async () => {
         await completeStop();
      }, 2000)
   }
}