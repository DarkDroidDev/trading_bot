import EventEmitter from 'events';
import { parentPort, workerData } from "worker_threads";
import BinanceTrading from './binance-client.js';
import { checkClose, checkOpen, variableReset, CancelLevelsOverProtections } from './strategy/strategy-functions.js';
import { listHistoryOrders, getPositionInfo, listOpenOrders, setMinLotSize, sendMessage, updateOpenOrders } from './strategy/global-function.js';
import { onStart } from './strategy/strategyStart-functions.js';
import { onStop } from './strategy/strategyStop-functions.js';
import { onPause } from './strategy/strategyPause-functions.js';
import { onFirstTick, onCandleErrorMessages, onCalcIndicators } from './strategy/candle-functions.js';
import emoji from 'node-emoji';
import { Console as console } from './logger-mod.js';
import { timer,timerMBOrder, timerTPOrder } from './strategy/TimerTask.js';

var isPositionCalled = false;
var isListOpenOrders = false;

export const sessionAmountPriceCalculations = {
   BuyLevelPrice1: 0,
   BuyLevelPrice2: 0,
   BuyLevelPrice3: 0,
   SellLevelPrice1: 0,
   SellLevelPrice2: 0,
   SellLevelPrice3: 0,
   amountBuy1: 0,
   amountBuy2: 0,
   amountBuy3: 0,
   amountSell1: 0,
   amountSell2: 0,
   amountSell3: 0
};

// variabili di sessione della strategia
export const strategySessions = {
   chatId: -1,
   positionInfo: {
      orderId: -1,
      positionSide: 'BOTH',
      entryPrice: '0.0000',
      positionAmount: '0.000',
      unrealizedPnL: '0.000'
   },
   currentOrders: [],
   currentClosePrice: -1,
   isActive: false,
   strategyOrdersInserted: false,
   bollinger: {
      lower: -1, upper: -1, middle: -1
   },
   dmi: {
      pdi: -1, mdi: -1
   },
   symbol: '',
   kcounter: -1,
   kMaxCount: 0,
   prevCloseTime: 0,
   // se è stato selezionato start su telegram
   tgstatus: "",
   // pdi e mdi  sono compresi in ACTIVATION_INTERVAL da 6 candele a questa parte
   active2: false,
   // il current price deve essere 
   active3: false,
   active4: true,
   active5: true,
   minLotSize: -1,
   candleChangeFn: null,
   storedpositionSide: '',
   historyOrders: [],
   messageSent_1: false,
   messageSent_2: false,
   messageSent_4: false,
   messageSent_5: false,
   messageSent_6: false,
   messageSent_7: false,
   messageSent_8: false,
   messageSent_9: false,
   statusSTARTActive: false,
   statusPAUSEActive: false,
   statusSTOPActive: false,
   orderFilter: -1,
   balance: -1,
   defaultCurrency: 'USDT',
   currentLowPrice: 0,
   currentHighPrice: 0,
   currentOpenPrice: 0,
   messageSent_OpenCheck: false,
   messageSent_active2: false,
   messageSent_active3: false,
   OutDmiIntervalActive: false,
   startLevel: -1,
   startSide: 'BOTH',
   prevOrderTriggered: 0,
   orderTriggered: 0,
   MBTriggerd: false,
   MBOrderInserted: false,
   checkLevelTriggered: false,
   check1LevelTriggered: false,
   check2LevelTriggered: false,
   checkLevel3Triggered: false,
   checkLevelForCheckClose: false,
   check1Level: 0,
   check2Level: 0,
   levelTriggered: false,
   SLClosed: false,
   TPClosed: false,
   TPOrderInserted: false,
   protectionInserted: false,
   positionAmountClosedToMB: -1,
   lastResetTime: -1,
   dmiTriggered: false,
   midBollLossTriggered: false,
   SLPriceBuyAtStart: -1,
   SLPriceSellAtStart: -1,
   lastInterval: new Date().getTime(),
   realizedProfit: 0,
   prevRealizedProfit: 0,
   settings: {
      chatId: -1,
      pair: "",
      feesMax: 0.1,
      levaMax: 1,
      longOrderAmount1: 200,
      longOrderAmount2: 200,
      longOrderAmount3: 500,
      longTradePricePercent1: 0.3,
      longTradePricePercent2: -1,
      longTradePricePercent3: -5,
      shortOrderAmount1: 200,
      shortOrderAmount2: 200,
      shortOrderAmount3: 500,
      shortTradePricePercent1: -0.3,
      shortTradePricePercent2: 1,
      shortTradePricePercent3: 5,
      smartTakeProfit: 1,
      startLevelPercent: -2,
      stopBotFor: 6,
      stopLossPercent: 5,
      takeProfitPercent: -1,
      timeFrame: "5m",
      timeOorderExpiration: 30,
      limDMIMin: 9,
      limDMIMax: 40,

   },
   symbolSettings: {},
   openOrders: []
}

if (!workerData && !workerData.data.symbol || !workerData.data.chatId) {
   parentPort.postMessage({
      msg: "update",
      type: "error_instance",
   })

   parentPort.close();
}

console.debug(workerData);
export const bInstance = new BinanceTrading({
   id: workerData.data.chatId
});

strategySessions.defaultCurrency = await bInstance.getDefaultCurrencyFromAccount();

await bInstance.loadSettings(workerData.data.symbol);
await bInstance.loadSymbolSettings(workerData.data.symbol);

strategySessions.symbol = workerData.data.symbol;
strategySessions.chatId = workerData.data.chatId;
strategySessions.symbolSettings = bInstance.symbolSettings;

strategySessions.settings = bInstance.settings;

strategySessions.listHistoryOrders = await listHistoryOrders();
export const strategyEvents = new EventEmitter();

async function main() {
   try {
      variableReset();
      stopKCount();
      console.debug("stopKCount in strategy-mod: 169");
      /// ottiene la lista dell'history degli ordini e li mette in sessione
      if (strategySessions.listHistoryOrders && strategySessions.listHistoryOrders.length > 0) {
         strategySessions.orderFilter = strategySessions.listHistoryOrders[strategySessions.listHistoryOrders.length - 1].orderId + 1;
      }
      const posInfo = await getPositionInfo();
      const openOrdersList = await listOpenOrders();
      if (posInfo) {
         strategySessions.positionInfo.unrealizedPnL = posInfo.unRealizedProfit;
         strategySessions.positionInfo.entryPrice = posInfo.entryPrice;
         strategySessions.positionInfo.positionAmount = posInfo.positionAmt;
         isPositionCalled = true;
      }


      if (openOrdersList) {
         strategySessions.currentOrders = await updateOpenOrders();
         isListOpenOrders = true;
      }
   }
   catch (err) {
      console.error(err);
      parentPort.close();
   }
}


strategyEvents.on("NEXT_CANDLE", (_closeTime) => {
   strategySessions.active4 = true;
   strategySessions.lastResetTime = (new Date()).getTime();
   console.debug(`NEXT_CANDLE: ${_closeTime}, active4: ${strategySessions.active4} kcount ${strategySessions.kcounter} max kCount ${strategySessions.kMaxCount}`);
   if (strategySessions.candleChangeFn) {
      strategySessions.candleChangeFn(_closeTime);
   }

   if (strategySessions.kcounter > -1) {
      if (strategySessions.kcounter < strategySessions.kMaxCount) {
         strategySessions.kcounter++;
         console.debug("strategy-functions 212, valore kcounter: ", strategySessions.kcounter);
         strategySessions.active5 = false;
      } else if (strategySessions.kcounter == strategySessions.kMaxCount) {
         stopKCount();
         console.debug("stopKCount in strategy-mod: 214");
      }
   }
});

/**
 * Esegue lo start del conteggio candela
 * @param {number} maxKCount 
 */
export const startkCount = (maxKCount) => {
   strategySessions.active5 = false;
   strategySessions.kMaxCount = maxKCount;
   strategySessions.kcounter = 0;
}

/**
 * Esegue lo stop del conteggio candela
 */
export const stopKCount = () => {
   strategySessions.kMaxCount = 0;
   strategySessions.kcounter = -1;
   strategySessions.active5 = true;
}

/**
 * In questa funzione verranno mandati gli updates delle posizioni
 * @param {*} msg 
 * @param {*} position 
 */
const OnPositionUpdate = async (position) => {
   try {

      console.debug('in OnPositionUpdate entryprice: ', position.entryPrice);
      strategySessions.positionInfo.entryPrice = position.entryPrice;
      strategySessions.positionInfo.positionAmount = position.positionAmount;
      strategySessions.positionInfo.unrealizedPnL = position.unrealizedPnL;
      console.debug(`in position entry price: ${position.entryPrice}`);

      return true;
   }
   catch (err) {
      console.error('position ', sendMessageerr);
   }
   return false;
}

/**
 * In questa funzione verranno mandati gli updates degli ordini
 * @param {*} msg 
 * @param {*} orders 
 * @param {*} chatId 
 */
async function OnUpdateOrders(orders) {
   try {
      const statusOrder = orders.status || orders.orderStatus;
      // ogni volta che arriva un update di un ordine resetta il time del chek open
      strategySessions.lastResetTime = (new Date()).getTime();
      console.debug(`Binance orders: ${orders.orderId}, status: ${statusOrder}, order side: ${orders.side}, position info order id:  ${strategySessions.positionInfo.orderId}`);
      // gestione cambio status ordini
      if (statusOrder === 'FILLED') {
         strategySessions.lastResetTime = (new Date()).getTime();
         if (strategySessions.positionInfo.orderId < 0) {
            strategySessions.positionInfo.orderId = orders.orderId;
            strategySessions.positionInfo.positionSide = orders.side;
            console.info("in update order received position info on order ", strategySessions.positionInfo.orderId, " side ", strategySessions.positionInfo.positionSide);
         }
      }
      strategySessions.currentOrders = await updateOpenOrders();
      console.debug('current orders', strategySessions.currentOrders);
      console.debug('open orders', strategySessions.openOrders);
   }
   catch (err) {
      console.error('error on orders ', err);
   }

   await checkOpen();
}

/**
 * In questa funzione verranno mandati gli updates delle candele
 * 
 * @param {*} candleUpdates
 * @returns 
 */
async function OnCandleTick(chatId, settings, msg, errorcode, errortext, kclosePrice, minNotional, qtyPrecision, bollingerBandIndicator, dmxIndicator, symbol, prevCloseTime, kTick) {
   try {

      // logica da utlizzare solo la prima volta che arriva una candela
      onFirstTick(settings);


      /// gestiojne errori
      onCandleErrorMessages(msg, errorcode, errortext);

      /// informazioni sulla candella /////////////////////
      if (msg == 'kline') {
         
         strategySessions.currentClosePrice = Number(kclosePrice);
         strategySessions.currentLowPrice = Number(kTick.low);
         strategySessions.currentHighPrice = Number(kTick.high);
         strategySessions.currentOpenPrice = Number(kTick.open);
         setMinLotSize(minNotional, kclosePrice, qtyPrecision);
        

         // messggi camdela
         const bollSize = bollingerBandIndicator.length - 1;
         const bDmiSize = dmxIndicator.length - 1;
         onCalcIndicators(bollingerBandIndicator, bollSize, dmxIndicator, bDmiSize, prevCloseTime);

         sessionAmountPriceCalculations.BuyLevelPrice1 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent1 / 100));
         sessionAmountPriceCalculations.BuyLevelPrice2 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent2 / 100));
         sessionAmountPriceCalculations.BuyLevelPrice3 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent3 / 100));
         sessionAmountPriceCalculations.SellLevelPrice1 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent1 / 100));
         sessionAmountPriceCalculations.SellLevelPrice2 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent2 / 100));
         sessionAmountPriceCalculations.SellLevelPrice3 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent3 / 100));
         sessionAmountPriceCalculations.amountBuy1 = Number(Number((Math.round(Number(settings.longOrderAmount1 / sessionAmountPriceCalculations.BuyLevelPrice1) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         sessionAmountPriceCalculations.amountBuy2 = Number(Number((Math.round(Number(settings.longOrderAmount2 / sessionAmountPriceCalculations.BuyLevelPrice2) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         sessionAmountPriceCalculations.amountBuy3 = Number(Number((Math.round(Number(settings.longOrderAmount3 / sessionAmountPriceCalculations.BuyLevelPrice3) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         sessionAmountPriceCalculations.amountSell1 = Number(Number((Math.round(Number(settings.shortOrderAmount1 / sessionAmountPriceCalculations.SellLevelPrice1) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         sessionAmountPriceCalculations.amountSell2 = Number(Number((Math.round(Number(settings.shortOrderAmount2 / sessionAmountPriceCalculations.SellLevelPrice2) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         sessionAmountPriceCalculations.amountSell3 = Number(Number((Math.round(Number(settings.shortOrderAmount3 / sessionAmountPriceCalculations.SellLevelPrice3) * Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision)))) / Number(Math.pow(10,strategySessions.symbolSettings.qtyPrecision))).toFixed(strategySessions.symbolSettings.qtyPrecision));
         ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
         ////////////////////////////////////////////////////////////////// STRATEGY START //////////////////////////////////////////////////////////////////
         ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
         await OnInterval(); // ogni sec
         if (strategySessions.tgstatus === "START") {
            await onStart(settings, dmxIndicator, bDmiSize);
         }

         else if (strategySessions.tgstatus === "STOP") {
            await onStop();
         }

         // il bot non chiude le posizioni ma chiude il take profit e gli open orders non ancora entrati in posizione mantenendo lo stop loss inserito, non apre nuove posizioni
         else if (strategySessions.tgstatus === "PAUSE") {
            await onPause();
         }
         //await OnInterval(5000); // ripeti ogni 5 sec
         ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
         ////////////////////////////////////////////////////////////////// STRATEGY END ////////////////////////////////////////////////////////////////////
         ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      }
   }
   catch (err) {
      console.error(err);
   }

   // await OnInterval();
}

export const performStrategies = async ({
   chatId, msg, errorcode, errortext, symbol,
   bollingerBandIndicator, dmxIndicator, prevCloseTime, kclosePrice, minNotional, qtyPrecision,
   kTick, settings }) => {

   await OnCandleTick(chatId,
      settings,
      msg, errorcode, errortext, kclosePrice,
      minNotional, qtyPrecision, bollingerBandIndicator, dmxIndicator,
      symbol, prevCloseTime, kTick);


   return true;

};
export const completeStop = () => {

   parentPort.postMessage({
      msg: "update",
      type: "complete_stop",
      chatId: strategySessions.chatId
   });
}

await bInstance.client.useServerTime(async () => {
   console.debug('server time aligned !!');
   await main();
});

bInstance.balance_update_callback = async function (data) {
   try {
      //await OnPositionUpdate(data.updateData.positions[0]);
   } catch (err) {
      console.error(err);
   }
}

bInstance.order_update_callback= async function (data) {
   try {
      ///// ordini
      //await OnUpdateOrders(data.order); lo fa già il timer
      /// NOTA: qui entrano tutti gli aggiornamenti degli ordini quindi va filtrato
      /// usa break point
      if (data.order.realizedProfit != 0 && data.order.realizedProfit != strategySessions.prevRealizedProfit) { 
         strategySessions.realizedProfit = data.order.realizedProfit;
         strategySessions.prevRealizedProfit = strategySessions.realizedProfit;
         sendMessage(strategySessions.chatId, `${emoji.emoji.dollar} realized profit: ${Number(strategySessions.realizedProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      //if (realizedProfit != 0) {
         console.debug(`realized profit ${strategySessions.realizedProfit}`);
      //}
   } catch (err) {
      console.error(err);
   }
}

// aggancia le info dell'account
await bInstance.client.websockets.userFutureData(
   false,
   /// aggiornamento posizioni
   bInstance.balance_update_callback,
   // aggiornamento ordini
   bInstance.order_update_callback);
// aggancia le candele 
await bInstance.client.futuresChart(bInstance.settings.pair, bInstance.settings.timeFrame,
   /// aggiornamenti candela
   async (symbol, interval, chart) => {
      try {
         const kLineObject = await bInstance.chartcallback(symbol, interval, chart);
         await performStrategies(kLineObject);
      } catch (err) {
         console.error(err);
      }
   });

const checkInterval = (time) => {
   const timeNow = new Date().getTime();
   const lastInterval = strategySessions.lastInterval;
   const intervalDifference = timeNow - lastInterval;
   if (intervalDifference <= time) {
      return false;
   }
   strategySessions.lastInterval = new Date().getTime();
   return true;
}
// verifica periodica degli ordini
const executeOrderUpdateInterval = async () => {
   try {

      const posInfo = await getPositionInfo();
      if (posInfo) {
         strategySessions.positionInfo.unrealizedPnL = posInfo.unRealizedProfit;
         strategySessions.positionInfo.entryPrice = posInfo.entryPrice;
         strategySessions.positionInfo.positionAmount = posInfo.positionAmt;

         // questo ciclo riassegna il posizionside in funzione dell'amount della positionInfo in corsa, infatti positionInfo < 0 equivalgono a position di SELL
         if (strategySessions.positionInfo.positionAmount > 0) {
            strategySessions.positionInfo.positionSide = 'BUY';
         }
         else if (strategySessions.positionInfo.positionAmount < 0) {
            strategySessions.positionInfo.positionSide = 'SELL';
         }
         else strategySessions.positionInfo.positionSide = 'BOTH';

         //console.debug("update position info : entry price", strategySessions.positionInfo.entryPrice );
         isPositionCalled = true;
      }

      strategySessions.currentOrders = await updateOpenOrders();

      if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0 &&
         strategySessions.positionInfo.entryPrice > 0 &&
         strategySessions.positionInfo.positionSide === 'BOTH' &&
         strategySessions.positionInfo.orderId < 0) {

         const orderFilled = strategySessions.currentOrders.filter((o) => o.status === 'FILLED');
         if (!!orderFilled && orderFilled.length > 0 && !!orderFilled[0]) {
            await OnUpdateOrders(orderFilled[0]);
         }
      }
      await checkClose(strategySessions.settings);
      await CancelLevelsOverProtections(strategySessions.settings);
      await checkOpen();
   } catch (err) {
      console.error(err);
   }
}

parentPort.on('message', async (messages) => {

   const type = messages.msg;
   const cmd = messages.cmd;

   if (cmd === 'detach') {
      await bInstance.terminateSockets();
      console.debug("sockets terminated");

      // invia il segnlale che la strategia e' terminata
      parentPort.postMessage({
         msg: 'update',
         type: 'terminated'
      });
      /////////////////////////////////////////////////////
      return;
   }

   if (type === 'telegram') {
      const tgStatus = messages.tgStatus;

      if (strategySessions.tgstatus !== tgStatus) {
         strategySessions.tgstatus = tgStatus;
         if (strategySessions.tgstatus === "START") {
            sendMessage(strategySessions.chatId, `${emoji.emoji.chart} The strategy has status ${strategySessions.tgstatus} now`);
         }
         else if (strategySessions.tgstatus === "STOP") {
            sendMessage(strategySessions.chatId, `${emoji.emoji.cl} The strategy has status ${strategySessions.tgstatus} now`);
         }
         else if (strategySessions.tgstatus === "PAUSE") {
            sendMessage(strategySessions.chatId, `${emoji.emoji.eight_pointed_black_star} The strategy has status ${strategySessions.tgstatus} now`);
         }
      }
      return;
   }

   if (type === 'change_settings') {
      reloadSettings(messages);
      return;
   }
});

parentPort.on('messageerror', (messages) => {
   console.error('service msg error', messages);
   parentPort.postMessage({
      msg: 'update',
      type: 'messageerror'
   })
});

parentPort.on('close', async (messages) => {
   console.debug("close ", messages);
   if (orderUpdateInterval > 0) {
      clearInterval(orderUpdateInterval);
   }
   await bInstance.terminateSockets();
   parentPort.postMessage({
      msg: 'update',
      type: 'closed'
   })
});

parentPort.start();

parentPort.postMessage({
   msg: 'update',
   type: 'ready'
});

/**
 * Inserire qui tutte le funzioni che verranno 
 * eseguite con intervallo di un sec all'inizio della candlestick
 */
async function OnInterval(time) {
   try {
      if(!time){
         time = process.env.BINANCE_ORDER_UPDATE_FREQ;
      }
      /// verifica solo la frequenza e l'attimo in cui chiamare la funzione 
      // del timer
      await timer.run();
      await timerMBOrder.run();
      await timerTPOrder.run();

      if (checkInterval(time)) {
         executeOrderUpdateInterval();
         return true;
      }
   } catch (err) {
      console.error(err);
   }

   return false;
}

async function reloadSettings(messages) {
   await bInstance.loadSettings(messages.pair);
   await bInstance.loadSymbolSettings(messages.pair);
   sendMessage(bInstance.chat.id, `${emoji.emoji.accept}${emoji.emoji.clap} The settings has been updated !!`);
}
process.once('SIGINT', async () => {
   await bInstance.terminateSockets();
})
process.once('SIGTERM', async () => {
   await bInstance.terminateSockets();
});