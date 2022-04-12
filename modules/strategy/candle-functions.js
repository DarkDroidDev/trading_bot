import { strategySessions, strategyEvents } from '../strategy-mod.js';
import { Console as console } from '../logger-mod.js';

export function onCalcIndicators(bollingerBandIndicator, bollSize, dmxIndicator, bDmiSize, prevCloseTime) {
   strategySessions.bollinger.lower = bollingerBandIndicator[bollSize].lower;
   strategySessions.bollinger.upper = bollingerBandIndicator[bollSize].upper;
   strategySessions.bollinger.middle = bollingerBandIndicator[bollSize].middle;

   strategySessions.dmi.pdi = dmxIndicator[bDmiSize].pdi;
   strategySessions.dmi.mdi = dmxIndicator[bDmiSize].mdi;

   if (strategySessions.prevCloseTime == 0)
      strategySessions.prevCloseTime = prevCloseTime;

   if (strategySessions.prevCloseTime !== prevCloseTime) {
      strategySessions.prevCloseTime = prevCloseTime;
      strategyEvents.emit("NEXT_CANDLE", prevCloseTime);
   }
}
export function onCandleErrorMessages(msg, errorcode, errortext) {
   if (msg === 'error') {
      console.error("recived error errorcode ", errorcode, ' errortext ' ,errortext);

      if (errorcode === 'size_too_low') {
         // logica per 
      }
   }
}
let lastCurrentTime = 0;
export function onFirstTick(settings) {
   strategySessions.settings = settings;
   const currentTime = new Date().getTime();

   if ((currentTime - lastCurrentTime) >= 15000) {
      lastCurrentTime = currentTime;
      console.info('total current orders ', strategySessions.currentOrders.length);
      console.debug('current orders ', strategySessions.currentOrders);
      
      console.info('total open orders ', strategySessions.openOrders.length);
      console.debug('open orders ', strategySessions.openOrders);
      // updateOpenOrders().then((res) => {
      //    strategySessions.currentOrders= res;
      //    console.debug('current orders ', strategySessions.currentOrders);
      // }).catch(() => console.error);
   }
}

export function onTelegramMessages(msg) {
   if (msg === 'telegram') {
      if (!!msg.tgstatus) {
         strategySessions.tgstatus = msg.tgstatus;
         console.info('Strategy status has been set to ', strategySessions.tgstatus);
      }
   }
}
