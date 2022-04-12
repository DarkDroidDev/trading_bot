import { cancelOrder, cancelAllOrders, sendMessage, insertTPOrder, insertMBOrder, cancelOpenedMultiOrders, updateOpenOrders } from './global-function.js';
import { ErrorMessage, checkOrderTriggered, checkMBTriggered, CalculateAndInsertOpenOrdersOnWorking, CalculateAndInsertProtections, CalculateAndInserMBOrder, forcePositionInfo, closePositionCancelAllOrdersAndReset, CalculateProfit, calculateBalance, cancelProtections, cancelMBOrder, SLPriceAtStart, CalculateAndInsertTPOrder, cancelTPOrder } from './strategy-functions.js';
import { startkCount, strategySessions } from '../strategy-mod.js';
import emoji from 'node-emoji';
import { timer, timerMBOrder, timerTPOrder, stopAllTimers } from './TimerTask.js';
import { Console as console } from '../logger-mod.js';

const protectionControlSession = {
   executed: false
}
const MBOrderControlSession = {
   executed: false
}
const TPOrderControlSession = {
   executed: false
}

// la funzione strategyCore viene letta solo se la variabile statusSTARTActive = true
export async function strategyCore(settings) {

   strategySessions.orderTriggered = await checkOrderTriggered();
   strategySessions.MBTriggerd = await checkMBTriggered();

   // ogni 5 minuti aggiorna gli ordini pendenti ma solo nel caso non sia disabilitato da un altro timer
   timer.on('TIMER', async () => {
      await onTimer("strategyCore: open orders fine tuned by Timer 0!");
      console.debug('strategyCore 17 in TIMER');
   });
   
   timerMBOrder.on('TIMER_MB_ORDER', async () => {
      await onTimerMBOrder ("strategyCore: Mid Band Orderd fine tuned by timerMBOrder");
      console.debug('strategyCore 28 in TIMER_MB_ORDER');
   });

   timerTPOrder.on('TIMER_TP_ORDER', async () => {
      await onTimerTPOrder ("strategyCore: TP Orderd fine tuned by timerTPOrder",strategySessions.settings);
      console.debug('strategyCore 37 in TIMER_TP_ORDER');
   });

   if (!strategySessions.levelTriggered) {

      if (strategySessions.startLevel == 0 && strategySessions.positionInfo.entryPrice > 0) {

         strategySessions.levelTriggered = true;
         strategySessions.protectionInserted = false;
         console.debug(`strategyCore 25, levelTriggered: ${strategySessions.levelTriggered}, positionSide: ${strategySessions.positionInfo.positionSide}`);
         await stopAllTimers();
         await SLPriceAtStart(settings);

         if (strategySessions.positionInfo.positionSide == "BUY") {
            strategySessions.lastResetTime = (new Date()).getTime();
            await cancelOpenedMultiOrders("SELL");
            await CalculateAndInserMBOrder();
            timerMBOrder.playFromStart();
            await CalculateAndInsertProtections(settings);
            timerTPOrder.playFromStart();
            console.debug("protection inserterd at strategyCore: 32");
            sendMessage(strategySessions.chatId, `all orders SELL will be deleted`);
            console.debug(`strategyCore 46 opposite orders SELL deleted, startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            strategySessions.currentOrders = await updateOpenOrders();
         }
         else if (strategySessions.positionInfo.positionSide == "SELL") {
            strategySessions.lastResetTime = (new Date()).getTime();
            await cancelOpenedMultiOrders("BUY");
            await CalculateAndInserMBOrder();
            timerMBOrder.playFromStart();
            await CalculateAndInsertProtections(settings);
            timerTPOrder.playFromStart();
            console.debug("protection inserterd at strategyCore: 41");
            sendMessage(strategySessions.chatId, `all orders BUY will be deleted`);
            console.debug(`strategyCore 61 opposite orders BUY deleted, startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            strategySessions.currentOrders = await updateOpenOrders();
         }

         // se non trova aggiornata la posizione allora riporta a false la variabile strategySessions.levelTriggered, in modo da permettere il rientro nel ciclo al tick seguente
         else {
            strategySessions.levelTriggered = false;
         }
      }
   }

   // strategySessions.protectionInserted viene inserita nell'if solo per avere maggior sicurezza che ha completato il ciclo di start e cancellato gli ordini opposti
   else if (strategySessions.levelTriggered && strategySessions.protectionInserted) {

      if (strategySessions.positionInfo.entryPrice > 0) {

         // ordine 1 inserito
         if (strategySessions.orderTriggered == 1) {

            if (strategySessions.positionInfo.positionSide == "BUY") {

               if (!strategySessions.messageSent_4) {

                  if (strategySessions.startLevel < 1) {
                     
                     strategySessions.messageSent_4 = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.one} Long position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     
                     if (strategySessions.SLPriceBuyAtStart != -1) {
                        sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceBuyAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     }
                     console.debug(`strategyCore 75 in orderTriggered BUY: ${strategySessions.orderTriggered}`)
                  }
               }

               strategySessions.check1Level = Number(strategySessions.positionInfo.entryPrice) * (1 + (settings.smartTakeProfit / 100));
               strategySessions.check2Level = strategySessions.bollinger.middle;

               if (!strategySessions.messageSent_7) {

                  strategySessions.messageSent_7 = true;
                  sendMessage(strategySessions.chatId, `Smart Take Profit positioned to: ${Number(strategySessions.check1Level).toLocaleString()} ${strategySessions.defaultCurrency}`);
               }

               // arrivati alla banda centrale se ha gia toccato lo smartTakeProfit dimezza solo la position e continua a gestire le protection vicine come nel caso di superamento dello smartTakeProfit
               if (Number(strategySessions.currentClosePrice) >= strategySessions.check2Level) {

                  // questo ciclo controlla se al tocco della banda centrale unrealizedPnL < 0 ed in quel caso chiude tutto e blocca per stopBot candele
                  if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                     strategySessions.midBollLossTriggered = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                     await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 1 BUY and Unrealized profit < 0");
                     startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                     console.debug("startKCount in strategyCore: 100");
                  }
               }

               // superato lo smartTakeProfit avvicina solo le protection ma non tocca la position che rimane uguale a prima
               else if (Number(strategySessions.currentClosePrice) >= strategySessions.check1Level && !strategySessions.check1LevelTriggered && !strategySessions.check2LevelTriggered) {
                  strategySessions.check1LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 99 orderTriggered === 1 al quale si sposta lo SL a erntyprice, check1Level: ${strategySessions.check1Level}`);
                  sendMessage(strategySessions.chatId, `${emoji.emoji.pushpin} Smart Take Profit reached, Stop Loss will be set at the entry price....`);
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }

               // non deve avere chiuso per la mid band di Bolinger in negativo perchè se è così questo ciclo va saltato e se ne occupa la variabile strategySessions.midBollLossTriggered
               if (strategySessions.MBTriggerd && !strategySessions.check2LevelTriggered && !strategySessions.midBollLossTriggered) {
                  timerMBOrder.stop();
                  strategySessions.check2LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 116 orderTriggered === 1 al quale si sposta lo SL a erntyprice e si dimezza la position, check2Level: ${strategySessions.check2Level}`);
                  await CalculateProfit("Mid Bollinger Band");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }
            }

            else if (strategySessions.positionInfo.positionSide == "SELL") {

               if (!strategySessions.messageSent_4) {
                  
                  if (strategySessions.startLevel < 1) {
                     
                     strategySessions.messageSent_4 = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.one} Short position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     
                     if (strategySessions.SLPriceSellAtStart != -1) {
                        sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceSellAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     }
                     console.debug(`strategyCore 144 in orderTriggered SELL: ${strategySessions.orderTriggered}`)
                  }
               }

               strategySessions.check1Level = Number(strategySessions.positionInfo.entryPrice) * (1 - (settings.smartTakeProfit / 100));
               strategySessions.check2Level = strategySessions.bollinger.middle;

               if (!strategySessions.messageSent_7) {

                  strategySessions.messageSent_7 = true;
                  sendMessage(strategySessions.chatId, `Smart Take Profit positioned to: ${Number(strategySessions.check1Level).toLocaleString()} ${strategySessions.defaultCurrency}`);
               }

               // arrivati alla banda centrale se ha gia toccato lo smartTakeProfit dimezza solo la position e continua a gestire le protection vicine come nel caso di superamento dello smartTakeProfit
               if (Number(strategySessions.currentClosePrice) <= strategySessions.check2Level) {

                  // questo ciclo controlla se al tocco della banda centrale unrealizedPnL < 0 ed in quel caso chiude tutto e blocca per stopBot candele
                  if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                     strategySessions.midBollLossTriggered = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency} ${emoji.emoji.chart_with_downwards_trend}`);
                     sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                     await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 1 SELL and Unrealized profit < 0");
                     startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                     console.debug("startKCount in strategyCore: 168");
                  }
               }

               // superato lo smartTakeProfit avvicina solo le protection ma non tocca la position che rimane uguale a prima
               else if (Number(strategySessions.currentClosePrice) <= strategySessions.check1Level && !strategySessions.check1LevelTriggered && !strategySessions.check2LevelTriggered) {
                  strategySessions.check1LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 156 orderTriggered === 1 al quale si sposta lo SL a erntyprice, check1Level: ${strategySessions.check1Level}`);
                  sendMessage(strategySessions.chatId, `${emoji.emoji.pushpin} Smart Take Profit reached, Stop Loss will be set at the entry price....`);
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }

               // non deve avere chiuso per avere tovvare la mid band di Bolinger in negativo perchè se è così questo ciclo va saltato e se ne occupa la variabile strategySessions.midBollLossTriggered
               if (strategySessions.MBTriggerd && !strategySessions.check2LevelTriggered && !strategySessions.midBollLossTriggered) {
                  timerMBOrder.stop();
                  strategySessions.check2LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 173 orderTriggered === 1 al quale si sposta lo SL a erntyprice e si dimezza la position, check2Level: ${strategySessions.check2Level}`);
                  await CalculateProfit("Mid Bollinger Band");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }
            }
         }

         // ordine 2 inserito
         else if (strategySessions.orderTriggered == 2) {

            if (strategySessions.positionInfo.positionSide == "BUY") {

               if (!strategySessions.messageSent_5) {

                  if (strategySessions.startLevel < 2) {
                     
                     strategySessions.messageSent_5 = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.two} Long position opened. New entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     
                     if (strategySessions.SLPriceBuyAtStart != -1) {
                        sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceBuyAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     }
                     console.debug(`strategyCore 218 in orderTriggered BUY: ${strategySessions.orderTriggered}`)
                  }
               }

               // questo ciclo adegua il TP una volta che un nuovo livello superiore viene aperto
               if (strategySessions.prevOrderTriggered < 2 && strategySessions.startLevel < 2) {
                  strategySessions.prevOrderTriggered = strategySessions.orderTriggered;

                  const TPOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "TP");
                  const MBOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "MB");
                  await forcePositionInfo();
                  
                  if (MBOrder !== -1) {
                     let posAmountMB = Math.abs(Number(strategySessions.positionInfo.positionAmount)/2);
                     strategySessions.positionAmountClosedToMB = strategySessions.positionInfo.positionAmount/2;
                     let midBollingerBand = strategySessions.bollinger.middle;
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(strategySessions.currentOrders[MBOrder].orderId);
                     const OrderMBResult = await insertMBOrder(midBollingerBand, posAmountMB);
                     timerMBOrder.playFromStart();
                     console.debug(`MB inserterd at strategyCore: 265, OrderMBResult ${OrderMBResult.orderId}`);
                     console.debug(`strategyCore 266, MB aggiornato con nuovo amount: ${posAmountMB} at price ${midBollingerBand}`);
                  }
                  
                  await forcePositionInfo();
                  if (TPOrder !== -1) {
                     const TPOrderLevel = Number(strategySessions.currentOrders[TPOrder].level);
                     let posAmountTP;
                     let posAmountMB;
                     if (!strategySessions.MBTriggerd) {
                        posAmountMB = Math.abs(Number(strategySessions.positionInfo.positionAmount)/2);
                        posAmountTP = Math.abs(Number(strategySessions.positionInfo.positionAmount))-Math.abs(Number(posAmountMB));
                     }
                     else {
                        posAmountTP = Math.abs(Number(strategySessions.positionInfo.positionAmount));
                     }
                     console.debug(`strategyCore: 282, TPOrder resized to: ${posAmountTP}, MB Order resized to: ${posAmountMB}`);
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(strategySessions.currentOrders[TPOrder].orderId);
                     
                     let { newTPOrder, errors } = await insertTPOrder(TPOrderLevel, posAmountTP);
                     console.debug(`strategyCore 274 InsertTPOrder newTPOrder: `, newTPOrder);          
                     
                     if (!!errors) {
                        await ErrorMessage("275");
                        console.error(`error while inserting TP, TPOrderLevel: ${TPOrderLevel}, posAmountTP: ${posAmountTP}`);
                     }
                     console.debug(`strategyCore 285, startLevel: ${strategySessions.startLevel}, orderTriggered: ${strategySessions.orderTriggered}, TP aggiornato con nuovo amount: ${posAmountTP} at price ${TPOrderLevel}`);
                  }
               }

               strategySessions.check1Level = Number(strategySessions.positionInfo.entryPrice) * (1 + (settings.smartTakeProfit / 100));
               strategySessions.check2Level = strategySessions.bollinger.middle;

               if (!strategySessions.messageSent_8) {
                  strategySessions.messageSent_8 = true;
                  sendMessage(strategySessions.chatId, `Smart Take Profit positioned to: ${Number(strategySessions.check1Level).toLocaleString()} ${strategySessions.defaultCurrency}`);
               }

               // arrivati alla banda centrale se ha gia toccato lo smartTakeProfit dimezza solo la position e continua a gestire le protection vicine come nel caso di superamento dello smartTakeProfit
               if (Number(strategySessions.currentClosePrice) >= strategySessions.check2Level) {

                  // questo ciclo controlla se al tocco della banda centrale unrealizedPnL < 0 ed in quel caso chiude tutto e blocca per stopBot candele
                  if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                     strategySessions.midBollLossTriggered = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency} ${emoji.emoji.chart_with_downwards_trend}`);
                     sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                     await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 2 BUY and Unrealized profit < 0");
                     startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                     console.debug("startKCount in strategyCore: 260");
                  }
               }

               // superato lo smartTakeProfit avvicina solo le protection ma non tocca la position che rimane uguale a prima
               else if (Number(strategySessions.currentClosePrice) >= strategySessions.check1Level && !strategySessions.check1LevelTriggered && !strategySessions.check2LevelTriggered) {
                  strategySessions.check1LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 236 orderTriggered === 2 al quale si sposta lo SL a erntyprice, check1Level: ${strategySessions.check1Level}`);
                  sendMessage(strategySessions.chatId, `${emoji.emoji.pushpin} Smart Take Profit reached, Stop Loss will be set at the entry price....`);
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }

               // non deve avere chiuso per avere tovvare la mid band di Bolinger in negativo perchè se è così questo ciclo va saltato e se ne occupa la variabile strategySessions.midBollLossTriggered
               if (strategySessions.MBTriggerd && !strategySessions.check2LevelTriggered && !strategySessions.midBollLossTriggered) {
                  timerMBOrder.stop();
                  strategySessions.check2LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 253 orderTriggered === 2 al quale si sposta lo SL a erntyprice e si dimezza la position, check2Level: ${strategySessions.check2Level}`);                     await CalculateProfit("Mid Bollinger Band");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }
            }

            else if (strategySessions.positionInfo.positionSide == "SELL") {

               if (!strategySessions.messageSent_5) {

                  if (strategySessions.startLevel < 2) {

                     strategySessions.messageSent_5 = true;            
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.two} Short position opened. New entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);

                     if (strategySessions.SLPriceSellAtStart != -1) {
                        sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceSellAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     }
                     console.debug(`strategyCore 305 in orderTriggered SELL: ${strategySessions.orderTriggered}`)
                  }
               }

               // questo ciclo adegua il TP una volta che un nuovo livello superiore viene aperto
               if (strategySessions.prevOrderTriggered < 2 && strategySessions.startLevel < 2) {
                  strategySessions.prevOrderTriggered = strategySessions.orderTriggered;

                  const TPOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "TP");
                  const MBOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "MB");
                  await forcePositionInfo();
                  
                  if (MBOrder !== -1) {
                     let posAmountMB = Math.abs(Number(strategySessions.positionInfo.positionAmount)/2);
                     strategySessions.positionAmountClosedToMB = strategySessions.positionInfo.positionAmount/2;
                     let midBollingerBand = strategySessions.bollinger.middle;
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(strategySessions.currentOrders[MBOrder].orderId);
                     const OrderMBResult = await insertMBOrder(midBollingerBand, posAmountMB);
                     timerMBOrder.playFromStart();
                     console.debug(`MB inserterd at strategyCore: 370, OrderMBResult ${OrderMBResult.orderId}`);
                     console.debug(`strategyCore 370, MB aggiornato con nuovo amount: ${posAmountMB} at price ${midBollingerBand}`);
                  }
                  
                  await forcePositionInfo();
                  if (TPOrder !== -1) {
                     const TPOrderLevel = Number(strategySessions.currentOrders[TPOrder].level);
                     let posAmountTP;
                     let posAmountMB;
                     if (!strategySessions.MBTriggerd) {
                        posAmountMB = Math.abs(Number(strategySessions.positionInfo.positionAmount)/2);
                        posAmountTP = Math.abs(Number(strategySessions.positionInfo.positionAmount))-Math.abs(Number(posAmountMB));
                     }
                     else {
                        posAmountTP = Math.abs(Number(strategySessions.positionInfo.positionAmount));
                     }
                     console.debug(`strategyCore: 396, TPOrder resized to: ${posAmountTP}, MB Order resized to: ${posAmountMB}`);
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(strategySessions.currentOrders[TPOrder].orderId);

                     let { newTPOrder, errors } = await insertTPOrder(TPOrderLevel, posAmountTP);
                     console.debug(`strategyCore 384 InsertTPOrder newTPOrder: `, newTPOrder);          
                     
                     if (!!errors) {
                        await ErrorMessage("387");
                        console.error(`error while inserting TP, TPOrderLevel: ${TPOrderLevel}, posAmountTP: ${posAmountTP}`);
                     }
                     console.debug(`strategyCore 389, startLevel: ${strategySessions.startLevel}, orderTriggered: ${strategySessions.orderTriggered}, TP aggiornato con nuovo amount: ${posAmountTP} at price ${TPOrderLevel}`);
                  }

               }

               strategySessions.check1Level = Number(strategySessions.positionInfo.entryPrice) * (1 - (settings.smartTakeProfit / 100));
               strategySessions.check2Level = strategySessions.bollinger.middle;

               if (!strategySessions.messageSent_8) {
                  strategySessions.messageSent_8 = true;
                  sendMessage(strategySessions.chatId, `Smart Take Profit positioned to: ${Number(strategySessions.check1Level).toLocaleString()} ${strategySessions.defaultCurrency}`);
               }

               if (Number(strategySessions.currentClosePrice) <= strategySessions.check2Level) {

                  // questo ciclo controlla se al tocco della banda centrale unrealizedPnL < 0 ed in quel caso chiude tutto e blocca per stopBot candele
                  if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                     strategySessions.midBollLossTriggered = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency} ${emoji.emoji.chart_with_downwards_trend}`);
                     sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                     await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 2 SELL and Unrealized profit < 0");
                     startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                     console.debug("startKCount in strategyCore: 345");
                  }
               }

               // superato lo smartTakeProfit avvicina solo le protection ma non tocca la position che rimane uguale a prima
               else if (Number(strategySessions.currentClosePrice) <= strategySessions.check1Level && !strategySessions.check1LevelTriggered && !strategySessions.check2LevelTriggered) {
                  strategySessions.check1LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 309 orderTriggered === 2 al quale si sposta lo SL a erntyprice, check1Level: ${strategySessions.check1Level}`);
                  sendMessage(strategySessions.chatId, `${emoji.emoji.pushpin} Smart Take Profit reached, Stop Loss will be set at the entry price....`);
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }

               // non deve avere chiuso per avere tovvare la mid band di Bolinger in negativo perchè se è così questo ciclo va saltato e se ne occupa la variabile strategySessions.midBollLossTriggered
               if (strategySessions.MBTriggerd && !strategySessions.check2LevelTriggered && !strategySessions.midBollLossTriggered) {
                  timerMBOrder.stop();
                  strategySessions.check2LevelTriggered = true;
                  strategySessions.checkLevelTriggered = true;
                  strategySessions.checkLevelForCheckClose = true;
                  console.debug(`strategyCore 326 orderTriggered === 2 al quale si sposta lo SL a erntyprice e si dimezza la position, check2Level: ${strategySessions.check2Level}`);
                  await CalculateProfit("Mid Bollinger Band");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
                  timerTPOrder.playFromStart();
               }
            }
         }

         else if (strategySessions.orderTriggered == 3) { // ordine 3 inserito

            if (strategySessions.positionInfo.positionSide == "BUY") {

               if (!strategySessions.messageSent_6) {

                  if (strategySessions.startLevel < 3) {
                     
                     strategySessions.messageSent_6 = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.three} Long position opened. New entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     console.debug(`strategyCore 393 in orderTriggered BUY: ${strategySessions.orderTriggered}`)
                     await CalculateProfit("Level 3 reached");
                  }
                  sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} no positions will be opened for the next ${settings.stopBotFor} candels, all opened position wil be managed, open orders will be deleted.`);
               }

               if (!strategySessions.checkLevel3Triggered) {

                  strategySessions.checkLevel3Triggered = true;
                  // Non inserisce nuovi pending orders e non apre nuove posizioni per le stopBotFor candele successive
                  startkCount(settings.stopBotFor);
                  timerMBOrder.stop();
                  timerTPOrder.stop();
                  console.debug("startKCount in strategyCore BUY: 423");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
               }

               // strategySessions.checkLevel3Triggered = true, questo ciclo continua a verificare mentreil bot ha raggiunto il 3° livello se torna giu a toccare le bande di Bollinger middle
               else {
                  strategySessions.check2Level = strategySessions.bollinger.middle;

                  // arrivati alla banda centrale se unrealizedProfit < 0 si chiude tutto e rimane bloccato per stopBot candele
                  if (Number(strategySessions.currentClosePrice) >= strategySessions.check2Level) {

                     // unrealizedPnL < 0
                     if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                        strategySessions.midBollLossTriggered = true;
                        sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency} ${emoji.emoji.chart_with_downwards_trend}`);
                        await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 3 BUY and Unrealized profit < 0");
                        sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                        startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                        console.debug("startKCount in strategyCore: 445");
                     }
                  }
               }
            }

            else if (strategySessions.positionInfo.positionSide == "SELL") {

               if (!strategySessions.messageSent_6) {

                  if (strategySessions.startLevel < 3) {

                     strategySessions.messageSent_6 = true;   
                     sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.three} Short position opened. New entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
                     console.debug(`strategyCore 456 in orderTriggered SELL: ${strategySessions.orderTriggered}`)
                     await CalculateProfit("Level 3 reached");
                  }
                  sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} no positions will be opened for the next ${settings.stopBotFor} candels, all opened position wil be managed, open orders will be deleted.`);
               }

               if (!strategySessions.checkLevel3Triggered) {

                  // quando questa variabile si attiva se si raggiunge il nuovo SL non c'è bisogno di fermarsi per 6 candele ma si riparte dalla candela successiva
                  strategySessions.checkLevel3Triggered = true;
                  // Non inserisce nuovi pending orders e non apre nuove posizioni per le stopBotFor candele successive
                  startkCount(settings.stopBotFor);
                  timerMBOrder.stop();
                  timerTPOrder.stop();
                  console.debug("startKCount in strategyCore SELL: 490");
                  await cancelProtections();
                  await CalculateAndInsertProtections(settings);
               }
               // strategySessions.checkLevel3Triggered = true, questo ciclo continua a verificare mentreil bot ha raggiunto il 3° livello se torna giu a toccare le bande di Bollinger middle
               else {
                  strategySessions.check2Level = strategySessions.bollinger.middle;

                  // arrivati alla banda centrale se unrealizedProfit < 0 si chiude tutto e rimane bloccato per stopBot candele
                  if (Number(strategySessions.currentClosePrice) <= strategySessions.check2Level) {

                     // unrealizedPnL < 0
                     if (strategySessions.positionInfo.unrealizedPnL < 0 && !strategySessions.midBollLossTriggered) {
                        strategySessions.midBollLossTriggered = true;
                        sendMessage(strategySessions.chatId, `${emoji.emoji.neutral_face} Middle Bollinger Band reached, your position and all open orders will be closed, you had a net loss of: ${Number(strategySessions.positionInfo.unrealizedPnL).toLocaleString()} ${strategySessions.defaultCurrency} ${emoji.emoji.chart_with_downwards_trend}`);
                        await closePositionCancelAllOrdersAndReset("close for middle bollinger band reached in level 3 SELL and Unrealized profit < 0");
                        sendMessage(strategySessions.chatId, `${emoji.emoji.hourglass_flowing_sand} Strategy will start again in ${settings.stopBotFor} candels`);
                        startkCount(settings.stopBotFor); // se è stato preso lo stop loss 1 (il primo inserito ovvero il più lontano) allora ferma tutto per stopBotFor candele
                        console.debug("startKCount in strategyCore: 507");
                     }
                  }
               }
            }
         }
         else if (strategySessions.orderTriggered > 3) { // ordini che si moltiplicano in modo anomalo
            console.error(`strategyCore 434 There more than 3 orderTriggered, orderTriggered: ${strategySessions.orderTriggered}`)
            await stopAllTimers();
            await ErrorMessage("436");
         }
      }
   }
}

// funzione che calcola i livelli di ingresso ed inserisce gli ordini pendenti SELL e BUY
export async function onTimer(logmessage) {
   if (!protectionControlSession.executed) {
      protectionControlSession.executed = true;
      strategySessions.lastResetTime = (new Date()).getTime();
      await cancelAllOrders();
      console.debug("cancellAllOrders from Timer, waiting for insert Orders and protections");
      strategySessions.protectionInserted = false;
      await CalculateAndInsertOpenOrdersOnWorking();
      console.debug(logmessage);
      protectionControlSession.executed = false;
   }
}

// funzione che ricalcola ogni 5 minuti la banda di Bollinger centrale ed aggiorna l'MBOrder
export async function onTimerMBOrder(logmessage) {
   if (!MBOrderControlSession.executed) {
      MBOrderControlSession.executed = true;
      await cancelMBOrder();
      console.debug("cancel MB order from TimerMBOrder, waiting for insert updated MB Order");
      strategySessions.MBOrderInserted = false;
      await CalculateAndInserMBOrder();
      console.debug(logmessage);
      MBOrderControlSession.executed = false;
   }
}

// funzione che ricalcola ogni 5 minuti il TP
export async function onTimerTPOrder(logmessage,settings) {
   if (!TPOrderControlSession.executed) {
      TPOrderControlSession.executed = true;
      await cancelTPOrder();
      console.debug("cancel TP order from TimerTPOrder, waiting for insert updated TP Order");
      strategySessions.TPOrderInserted = false;
      await CalculateAndInsertTPOrder(settings);
      console.debug(logmessage);
      TPOrderControlSession.executed = false;
   }
}
