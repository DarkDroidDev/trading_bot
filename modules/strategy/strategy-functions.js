import { cancelAllOrders, sendMessage, insertPartialClose, insertOrderBuyLimit, insertOrderSellLimit, insertOrderBuyMarket, insertOrderSellMarket, insertMulpleOrderBuy, insertMulpleOrderSell, insertOrderProtection, updateOpenOrders, cancelAllDBOrders, resetOrderFilter, insertSLOrder, insertTPOrder, insertMBOrder, cancelOrder, getPositionInfo } from './global-function.js';
import { strategySessions, startkCount, stopKCount, bInstance, sessionAmountPriceCalculations } from '../strategy-mod.js';
import emoji from 'node-emoji';
import { timer, timerMBOrder, timerTPOrder } from './TimerTask.js';
import { Console as console } from '../logger-mod.js';

// funzione che registra gli open orders in una struttura
export async function storeCurrentOrders() {
   let storedOrders = [];
   for (let i = 0; i < strategySessions.currentOrders.length; i++) {
      const itm = strategySessions.currentOrders[i];
      storedOrders.push({
         orderId: itm.orderId,
         status: itm.status,
         quantity: itm.quantity,
         type: itm.type,
         label: itm.label,
         side: itm.side,
         symbol: itm.symbol,
         level: itm.level,
         stopPrice: itm.stopPrice
      });
   }
}

export async function CalculateAndInsertOpenOrdersAtStart(settings) {
   const BuyLevelPrice1 = sessionAmountPriceCalculations.BuyLevelPrice1;
   const BuyLevelPrice2 = sessionAmountPriceCalculations.BuyLevelPrice2;
   const BuyLevelPrice3 = sessionAmountPriceCalculations.BuyLevelPrice3;
   const SellLevelPrice1 = sessionAmountPriceCalculations.SellLevelPrice1;
   const SellLevelPrice2 = sessionAmountPriceCalculations.SellLevelPrice2;
   const SellLevelPrice3 = sessionAmountPriceCalculations.SellLevelPrice3;
   const amountBuy1 = sessionAmountPriceCalculations.amountBuy1;
   const amountBuy2 = sessionAmountPriceCalculations.amountBuy2;
   const amountBuy3 = sessionAmountPriceCalculations.amountBuy3;
   const amountSell1 = sessionAmountPriceCalculations.amountSell1;
   const amountSell2 = sessionAmountPriceCalculations.amountSell2;
   const amountSell3 = sessionAmountPriceCalculations.amountSell3;
   const amountBuy1_2 = Math.abs(Number(amountBuy1)) + Math.abs(Number(amountBuy2));
   const amountBuy1_2_3 = Math.abs(Number(amountBuy1_2)) + Math.abs(Number(amountBuy3));
   const amountSell1_2 = Math.abs(Number(amountSell1)) + Math.abs(Number(amountSell2));
   const amountSell1_2_3 = Math.abs(Number(amountSell1_2)) + Math.abs(Number(amountSell3));

   if (BuyLevelPrice1 < SellLevelPrice1) {

      if (strategySessions.startSide === "BOTH") {

         if (strategySessions.positionInfo.entryPrice == 0) {

            if (!strategySessions.levelTriggered) {

               if (strategySessions.startLevel == 0) {
                  await insertMulpleOrderBuy(BuyLevelPrice1, BuyLevelPrice2, BuyLevelPrice3);
                  await insertMulpleOrderSell(SellLevelPrice1, SellLevelPrice2, SellLevelPrice3);
                  await forcePositionInfo();
                  strategySessions.lastResetTime = -1;
                  strategySessions.orderTriggered = 0;

                  if (!strategySessions.messageSent_2) {
                     strategySessions.messageSent_2 = true;
                     sendMessage(strategySessions.chatId, `${emoji.emoji.dart} started, 6 Orders correctly placed`);
                     console.debug(`strategyCore 64 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
                  }
                  strategySessions.currentOrders = await updateOpenOrders();
                  timer.playFromStart();
               }
            }
         }
      }

      else if (strategySessions.startSide === "BUY" && !strategySessions.levelTriggered) {

         await SLPriceAtStart(settings);

         if (strategySessions.startLevel == 1) {
            await insertOrderBuyMarket(amountBuy1, "1");
            await insertOrderBuyLimit(amountBuy2, BuyLevelPrice2, "2");
            await insertOrderBuyLimit(amountBuy3, BuyLevelPrice3, "3");
            await insertOrderSellLimit((amountBuy1 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 75");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 1;
            strategySessions.messageSent_4 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountBuy1 / 2;

            if (!strategySessions.messageSent_2 && strategySessions.positionInfo.entryPrice != 0 && strategySessions.SLPriceBuyAtStart != -1) {
               strategySessions.messageSent_2 = true;

               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.one} Long position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceBuyAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
               console.debug(`strategyCore 90 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         else if (strategySessions.startLevel == 2) {
            await insertOrderBuyMarket(amountBuy1_2, "2");
            await insertOrderBuyLimit(amountBuy3, BuyLevelPrice3, "3");
            await insertOrderSellLimit((amountBuy1_2 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 95");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 2;
            strategySessions.messageSent_5 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountBuy1_2 / 2;

            if (!strategySessions.messageSent_2 && strategySessions.SLPriceBuyAtStart != -1 && strategySessions.positionInfo.entryPrice != 0) {
               strategySessions.messageSent_2 = true;
               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.two} Long position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceBuyAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
               console.debug(`strategyCore 112 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         else if (strategySessions.startLevel == 3) {
            await insertOrderBuyMarket(amountBuy1_2_3, "3");
            await insertOrderSellLimit((amountBuy1_2_3 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 113");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 3;
            strategySessions.messageSent_6 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountBuy1_2_3 / 2;

            if (!strategySessions.messageSent_2 && strategySessions.startLevel > -1 && strategySessions.positionInfo.entryPrice != 0) {
               strategySessions.messageSent_2 = true;
               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_up} ${emoji.emoji.three} Long position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               await CalculateProfit("Level 3 reached");
               console.debug(`strategyCore 133 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         strategySessions.currentOrders = await updateOpenOrders();
         timerMBOrder.playFromStart();
         timerTPOrder.playFromStart();
      }

      else if (strategySessions.startSide === "SELL" && !strategySessions.levelTriggered) {

         await SLPriceAtStart(settings);

         if (strategySessions.startLevel == 1) {
            await insertOrderSellMarket(amountSell1, "1");
            await insertOrderSellLimit(amountSell2, SellLevelPrice2, "2");
            await insertOrderSellLimit(amountSell3, SellLevelPrice3, "3");
            await insertOrderBuyLimit((amountSell1 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 136");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 1;
            strategySessions.messageSent_4 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountSell1 / 2;

            if (!strategySessions.messageSent_2) {
               strategySessions.messageSent_2 = true;
               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.one} Short position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               if (strategySessions.SLPriceSellAtStart != -1)
                  sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceSellAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
               console.debug(`strategyCore 160 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         else if (strategySessions.startLevel == 2) {
            await insertOrderSellMarket(amountSell1_2, "2");
            await insertOrderSellLimit(amountSell3, SellLevelPrice3, "3");
            await insertOrderBuyLimit((amountSell1_2 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 154");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 2;
            strategySessions.messageSent_5 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountSell1_2 / 2;

            if (!strategySessions.messageSent_2) {
               strategySessions.messageSent_2 = true;
               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.two} Short position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               sendMessage(strategySessions.chatId, `Stop Loss positioned to: ${Number(strategySessions.SLPriceSellAtStart).toLocaleString()} ${strategySessions.defaultCurrency}`);
               console.debug(`strategyCore 181 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         else if (strategySessions.startLevel == 3) {
            await insertOrderSellMarket(amountSell1_2_3, "3");
            await insertOrderBuyLimit((amountSell1_2_3 / 2), strategySessions.bollinger.middle, "MB");
            await CalculateAndInsertProtections(settings);
            await forcePositionInfo();
            console.debug("protection inserterd at strategy-function: 171");
            strategySessions.levelTriggered = true;
            strategySessions.orderTriggered = 3;
            strategySessions.messageSent_6 = true;
            strategySessions.protectionInserted = true;
            strategySessions.MBOrderInserted = true;
            strategySessions.positionAmountClosedToMB = amountSell1_2_3 / 2;

            if (!strategySessions.messageSent_2) {
               strategySessions.messageSent_2 = true;
               sendMessage(strategySessions.chatId, `${emoji.emoji.round_pushpin} ${emoji.emoji.arrow_down} ${emoji.emoji.three} Short position opened. entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
               await CalculateProfit("Level 3 reached");
               console.debug(`strategyCore 201 startLevel: ${strategySessions.startLevel}, positionSide: ${strategySessions.positionInfo.positionSide}`)
            }
         }
         strategySessions.currentOrders = await updateOpenOrders();
         timerMBOrder.playFromStart();
         timerTPOrder.playFromStart();
      }
      return true;
   }
   strategySessions.statusSTARTActive = false;
   return false;
}

export async function CalculateAndInsertOpenOrdersOnWorking() {
   const BuyLevelPrice1 = sessionAmountPriceCalculations.BuyLevelPrice1;
   const BuyLevelPrice2 = sessionAmountPriceCalculations.BuyLevelPrice2;
   const BuyLevelPrice3 = sessionAmountPriceCalculations.BuyLevelPrice3;
   const SellLevelPrice1 = sessionAmountPriceCalculations.SellLevelPrice1;
   const SellLevelPrice2 = sessionAmountPriceCalculations.SellLevelPrice2;
   const SellLevelPrice3 = sessionAmountPriceCalculations.SellLevelPrice3;
   const amountBuy2 = sessionAmountPriceCalculations.amountBuy2;
   const amountBuy3 = sessionAmountPriceCalculations.amountBuy3;
   const amountSell2 = sessionAmountPriceCalculations.amountSell2;
   const amountSell3 = sessionAmountPriceCalculations.amountSell3;

   if (strategySessions.positionInfo.entryPrice == 0) {

      if (!strategySessions.levelTriggered) {

         if (strategySessions.startLevel == 0) {
            await insertMulpleOrderBuy(BuyLevelPrice1, BuyLevelPrice2, BuyLevelPrice3);
            await insertMulpleOrderSell(SellLevelPrice1, SellLevelPrice2, SellLevelPrice3);
            strategySessions.lastResetTime = -1;
            console.debug(`CalculateAndInsertOpenOrdersOnWorking 216, 6 Orders correctly fine tuned`)
         }
         strategySessions.currentOrders = await updateOpenOrders();
      }
   }
}

// questa funzione si occupa di definire le protection allo start del bot e dopo l'entrata di ordini ma non per situazioni in cui si è raggiunto il checkLevel  
export async function CalculateAndInsertProtections(settings) {
   console.debug(`CalculateAndInsertProtections positionSide ${strategySessions.positionInfo.positionSide}`);
   console.debug(`CalculateAndInsertProtections protectionInserted ${strategySessions.protectionInserted}`);
   await forcePositionInfo();

   if (!strategySessions.protectionInserted) {

      if (strategySessions.positionInfo.positionSide == "BUY") {
         await calculateProtectionsBuy(settings);

         // questa variabile a true serve per indicare al bot che l'intero ciclo delle protection è stato completato e quindi può andare oltre
         strategySessions.protectionInserted = true;
         strategySessions.TPOrderInserted = true;
      }

      else if (strategySessions.positionInfo.positionSide == "SELL") {
         await calculateProtectionsSell(settings)

         // questa variabile a true serve per indicare al bot che l'intero ciclo delle protection è stato completato e quindi può andare oltre
         strategySessions.protectionInserted = true;
         strategySessions.TPOrderInserted = true;
      }
   }
}

async function calculateProtectionsBuy(settings) {

   let stopLossBuy;
   let takeProfitBuy;

   if (strategySessions.dmiTriggered) {
      stopLossBuy = strategySessions.positionInfo.entryPrice;
      takeProfitBuy = strategySessions.bollinger.upper * (1 - (settings.takeProfitPercent / 100));
   }
   else {

      if (!strategySessions.checkLevel3Triggered) {

         if (!strategySessions.checkLevelTriggered) {

            if (strategySessions.SLPriceBuyAtStart != -1) {
               stopLossBuy = strategySessions.SLPriceBuyAtStart;
            }
            else {
               stopLossBuy = strategySessions.bollinger.lower * (1 - (settings.stopLossPercent / 100));
            }
            takeProfitBuy = strategySessions.bollinger.upper * (1 - (settings.takeProfitPercent / 100));
         }

         // strategySessions.checkLevelTriggered = true
         else {
            stopLossBuy = strategySessions.positionInfo.entryPrice * (1 + (settings.feesMax / 100));
            takeProfitBuy = strategySessions.bollinger.upper * (1 - (settings.takeProfitPercent / 100));
         }
      }
      // strategySessions.checkLevel3Triggered = true
      else {
         takeProfitBuy = strategySessions.positionInfo.entryPrice;
         stopLossBuy = strategySessions.SLPriceBuyAtStart;
      }
   }

   let BuyOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "NEW" && itm.side === "BUY" && (itm.label === "1" || itm.label === "2" || itm.label === "3"));
   let TPBuyAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));
   let SLBuyAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));

   if (!!BuyOrdersFind && BuyOrdersFind.length > 0) {

      for (let i = 0; i < BuyOrdersFind.length; i++) {

         if (BuyOrdersFind[i].level < takeProfitBuy && BuyOrdersFind[i].level > strategySessions.positionInfo.entryPrice) {
            TPBuyAmount = Math.abs(Number(TPBuyAmount)) + Math.abs(Number(BuyOrdersFind[i].quantity))
         }
         else if (BuyOrdersFind[i].level > stopLossBuy && BuyOrdersFind[i].level < strategySessions.positionInfo.entryPrice) {
            SLBuyAmount = Math.abs(Number(SLBuyAmount)) + Math.abs(Number(BuyOrdersFind[i].quantity))
         }
      }
   }
   console.debug(`strategySessions.tgstatus: ${strategySessions.tgstatus}`);
   // entra in questo ciclo anche quando il DMI è fuori dal range di confidenza, perchè è sempre in fase START anche in quel caso   
   if (strategySessions.tgstatus === "START") {

      console.debug(`CalculateAndInsertProtections 361 insertOrderProtection stopLossBuy: ${stopLossBuy}, takeProfitBuy: ${takeProfitBuy}`)
      let { newMulpleOrder, errors } = await insertOrderProtection(stopLossBuy, takeProfitBuy, SLBuyAmount, TPBuyAmount);
      console.debug(`CalculateAndInsertProtections 363 insertOrderProtection BUY newMulpleOrder:`, newMulpleOrder);

      if (!!errors) {
         await ErrorMessage("366");
         console.error(`error while inserting protections, stopLossBuy: ${stopLossBuy}, takeProfitBuy: ${takeProfitBuy}, SLBuyAmount: ${SLBuyAmount}, TPBuyAmount: ${TPBuyAmount}`);
      }
   }

   else if (strategySessions.tgstatus === "PAUSE") {
      console.debug(`CalculateAndInsertProtections 385 insertOrderSL stopLossBuy: ${stopLossBuy}`)
      let { SLOrder, errors } = await insertSLOrder(stopLossBuy, SLBuyAmount);
      console.debug(`CalculateAndInsertProtections 387 insertOrderSL BUY:`, SLOrder);
      // se SLOrder non è null e non è undefined allora è verificato l'if
      if (!!errors) {
         await ErrorMessage("390");
         console.error(`error while inserting protections, stopLossBuy: ${stopLossBuy}, SLBuyAmount: ${SLBuyAmount}`);
      }
   }

   strategySessions.currentOrders = await updateOpenOrders();
}

async function calculateProtectionsSell(settings) {

   let stopLossSell;
   let takeProfitSell;

   if (strategySessions.dmiTriggered) {
      stopLossSell = strategySessions.positionInfo.entryPrice;
      takeProfitSell = strategySessions.bollinger.lower * (1 + (settings.takeProfitPercent / 100));
   }
   else {

      if (!strategySessions.checkLevel3Triggered) {

         if (!strategySessions.checkLevelTriggered) {

            if (strategySessions.SLPriceSellAtStart != -1) {
               stopLossSell = strategySessions.SLPriceSellAtStart;
            }
            else {
               stopLossSell = strategySessions.bollinger.upper * (1 + (settings.stopLossPercent / 100));
            }
            takeProfitSell = strategySessions.bollinger.lower * (1 + (settings.takeProfitPercent / 100));
         }

         // strategySessions.checkLevelTriggered = true
         else {
            stopLossSell = strategySessions.positionInfo.entryPrice * (1 - (settings.feesMax / 100));
            takeProfitSell = strategySessions.bollinger.lower * (1 + (settings.takeProfitPercent / 100));
         }
      }

      // strategySessions.checkLevel3Triggered = true
      else {
         stopLossSell = strategySessions.SLPriceSellAtStart;
         takeProfitSell = strategySessions.positionInfo.entryPrice;
      }
   }

   let SellOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "NEW" && itm.side === "SELL" && (itm.label === "1" || itm.label === "2" || itm.label === "3"));
   let TPSellAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));
   let SLSellAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));

   if (!!SellOrdersFind && SellOrdersFind.length > 0) {

      for (let i = 0; i < SellOrdersFind.length; i++) {

         if (SellOrdersFind[i].level > takeProfitSell && SellOrdersFind[i].level < strategySessions.positionInfo.entryPrice) {
            TPSellAmount = Math.abs(Number(TPSellAmount)) + Math.abs(Number(SellOrdersFind[i].quantity))
         }
         else if (SellOrdersFind[i].level < stopLossSell && SellOrdersFind[i].level > strategySessions.positionInfo.entryPrice) {
            SLSellAmount = Math.abs(Number(SLSellAmount)) + Math.abs(Number(SellOrdersFind[i].quantity))
         }
      }
   }
   console.debug(`strategySessions.tgstatus: ${strategySessions.tgstatus}`);
   // entra in questo ciclo anche quando il DMI è fuori dal range di confidenza, perchè è sempre in fase START anche in quel caso   
   if (strategySessions.tgstatus === "START") {

      console.debug(`CalculateAndInsertProtections 457 insertOrderProtection stopLossSell: ${stopLossSell}, takeProfitBuy: ${takeProfitSell}`)
      let { newMulpleOrder, errors } = await insertOrderProtection(stopLossSell, takeProfitSell, SLSellAmount, TPSellAmount);
      console.debug(`CalculateAndInsertProtections 459 insertOrderProtection SELL newMulpleOrder: `, newMulpleOrder);
         
      if (!!errors) {
         await ErrorMessage("461");
         console.error(`error while inserting protections, stopLossSell: ${stopLossSell}, takeProfitSell: ${takeProfitSell}, SLSellAmount: ${SLSellAmount}, TPSellAmount: ${TPSellAmount}`);
      }
   }

   else if (strategySessions.tgstatus === "PAUSE") {

      console.debug(`CalculateAndInsertProtections 479 insertOrderSL stopLossBuy: ${stopLossSell}`)
      let { SLOrder, errors } = await insertSLOrder(stopLossSell, SLSellAmount);
      console.debug(`CalculateAndInsertProtections 458 insertOrderSL SELL:`, SLOrder);
      // se SLOrder non è null e non è undefined allora è verificato l'if
      if (!!errors) {
         await ErrorMessage("455");
         console.error(`error while inserting protections, stopLossSell: ${stopLossSell}, SLSellAmount: ${SLSellAmount}`);
      }
   }
   strategySessions.currentOrders = await updateOpenOrders();
}

// questa funzione si occupa di inserire il limit order a Mid Bollinger Band 
export async function CalculateAndInserMBOrder() {
   try {
      await forcePositionInfo();

      if (!strategySessions.MBOrderInserted && strategySessions.positionInfo.positionAmount != 0) {

         let midBollingerBand = strategySessions.bollinger.middle;
         let MBOrderAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount) / 2);
         strategySessions.positionAmountClosedToMB = strategySessions.positionInfo.positionAmount / 2;

         // entra in questo ciclo anche quando il DMI è fuori dal range di confidenza, perchè è sempre in fase START anche in quel caso   
         if (strategySessions.tgstatus === "START") {

            console.debug(`CalculateAndInsertMBOrder 443 MBOrder price: ${midBollingerBand}, MBOrderAmount: ${MBOrderAmount}`)
            let { newMBOrder, errors } = await insertMBOrder(midBollingerBand, MBOrderAmount);
            console.debug(`CalculateAndInsertMBOrder 447 MBOrderSell inserted:`, newMBOrder);

            if (!!errors) {
               await ErrorMessage("450");
               console.error(`error while inserting MB order SELL, price: ${midBollingerBand}, MBOrderSellAmount: ${MBOrderAmount}`);
            }
            strategySessions.MBOrderInserted = true;
            strategySessions.currentOrders = await updateOpenOrders();
         }
      }
   } catch (err) {
      console.error(err);
   }
}

// questa funzione si occupa di inserire il TP aggiornato 
export async function CalculateAndInsertTPOrder(settings) {
   try {
      console.debug(`CalculateAndInsertTPOrder positionSide ${strategySessions.positionInfo.positionSide}`);
      console.debug(`CalculateAndInsertTPOrder TPOrderInserted ${strategySessions.TPOrderInserted}`);
      await forcePositionInfo();
   
      if (!strategySessions.TPOrderInserted) {
   
         const MBOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "MB");
         let MBOrderAmount = 0;

         if (MBOrder !== -1) {
            MBOrderAmount = Math.abs(Number(strategySessions.currentOrders[MBOrder].quantity));
         }

         if (strategySessions.positionInfo.positionSide == "BUY") {
            let takeProfitBuy;
            if (strategySessions.dmiTriggered) {
               takeProfitBuy = strategySessions.bollinger.upper * (1 - (settings.takeProfitPercent / 100));
            }
            else { 
               if (!strategySessions.checkLevel3Triggered) {    
                  takeProfitBuy = strategySessions.bollinger.upper * (1 - (settings.takeProfitPercent / 100));
               }
               // strategySessions.checkLevel3Triggered = true
               else {
                  takeProfitBuy = strategySessions.positionInfo.entryPrice;
               }
            }

            let BuyOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "NEW" && itm.side === "BUY" && (itm.label === "1" || itm.label === "2" || itm.label === "3"));
            let TPBuyAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));
            
            if (!!BuyOrdersFind && BuyOrdersFind.length > 0) {

               for (let i = 0; i < BuyOrdersFind.length; i++) {
         
                  if (BuyOrdersFind[i].level < takeProfitBuy && BuyOrdersFind[i].level > strategySessions.positionInfo.entryPrice) {
                     TPBuyAmount = Math.abs(Number(TPBuyAmount)) + Math.abs(Number(BuyOrdersFind[i].quantity))
                  }
               }
               TPBuyAmount = TPBuyAmount - MBOrderAmount;
            }
            console.debug(`strategySessions.tgstatus, row 500: ${strategySessions.tgstatus}`);
            // entra in questo ciclo anche quando il DMI è fuori dal range di confidenza, perchè è sempre in fase START anche in quel caso   
            if (strategySessions.tgstatus === "START") {
         
               console.debug(`CalculateAndInsertTPOrder 504 InsertTPOrder takeProfitBuy: ${takeProfitBuy}`)
               let { newTPOrder, errors } = await insertTPOrder(takeProfitBuy, TPBuyAmount);
               console.debug(`CalculateAndInsertTPOrder 506 InsertTPOrder BUY newTPOrder:`, newTPOrder);
               
               // questa variabile a true serve per indicare al bot che il TP è stato inserito e quindi può procedere oltre
               strategySessions.TPOrderInserted = true;
         
               if (!!errors) {
                  await ErrorMessage("511");
                  console.error(`error while inserting TP, takeProfitBuy: ${takeProfitBuy}, TPBuyAmount: ${TPBuyAmount}`);
               }
            }       
         }
   
         else if (strategySessions.positionInfo.positionSide == "SELL") {
            let takeProfitSell;
            if (strategySessions.dmiTriggered) {
               takeProfitSell = strategySessions.bollinger.lower * (1 + (settings.takeProfitPercent / 100));
            }
            else {
               if (!strategySessions.checkLevel3Triggered) {
                  takeProfitSell = strategySessions.bollinger.lower * (1 + (settings.takeProfitPercent / 100));
               } 
               // strategySessions.checkLevel3Triggered = true
               else {
                  takeProfitSell = strategySessions.positionInfo.entryPrice;
               }
            }

            let SellOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "NEW" && itm.side === "SELL" && (itm.label === "1" || itm.label === "2" || itm.label === "3"));
            let TPSellAmount = Math.abs(Number(strategySessions.positionInfo.positionAmount));
         
            if (!!SellOrdersFind && SellOrdersFind.length > 0) {
         
               for (let i = 0; i < SellOrdersFind.length; i++) {
         
                  if (SellOrdersFind[i].level > takeProfitSell && SellOrdersFind[i].level < strategySessions.positionInfo.entryPrice) {
                     TPSellAmount = Math.abs(Number(TPSellAmount)) + Math.abs(Number(SellOrdersFind[i].quantity))
                  }
               }
               TPSellAmount = TPSellAmount - MBOrderAmount;
            }
            console.debug(`strategySessions.tgstatus, row 546: ${strategySessions.tgstatus}`);
            // entra in questo ciclo anche quando il DMI è fuori dal range di confidenza, perchè è sempre in fase START anche in quel caso   
            if (strategySessions.tgstatus === "START") {
         
               console.debug(`CalculateAndInsertTPOrder 550 InsertTPOrder, takeProfitSell: ${takeProfitSell}`)
               let { newTPOrder, errors } = await insertTPOrder(takeProfitSell, TPSellAmount);
               console.debug(`CalculateAndInsertTPOrder 552 InsertTPOrder SELL newTPOrder: `, newTPOrder);
               
               // questa variabile a true serve per indicare al bot che il TP è stato inserito e quindi può procedere oltre
               strategySessions.TPOrderInserted = true;
               
               if (!!errors) {
                  await ErrorMessage("554");
                  console.error(`error while inserting TP, takeProfitSell: ${takeProfitSell}, TPSellAmount: ${TPSellAmount}`);
               }
            }
         }
      }
   } catch (err) {
      console.error(err);
   }
}

/*
fissa il valore dello stop loss quando entra il primo livello (che può essere 1, 2 o 3 non è detto che sia il livello 1)
*/
export async function SLPriceAtStart(settings) {

   if (strategySessions.SLPriceBuyAtStart == -1) {
      strategySessions.SLPriceBuyAtStart = strategySessions.bollinger.lower * (1 - (settings.stopLossPercent / 100));
   }
   if (strategySessions.SLPriceSellAtStart == -1) {
      strategySessions.SLPriceSellAtStart = strategySessions.bollinger.upper * (1 + (settings.stopLossPercent / 100));
   }
}

/*
verifica se c'è stata chiusura a mano a TP o a SL, questa funzione viene lanciata ogni secondo dall'interno della funzione orderUpdateInterval in strategy-mode.jk
*/
export async function checkClose(settings) {

   if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0) {

      let SLOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "FILLED" && itm.label === "SL");
      let TPOrdersFind = strategySessions.currentOrders.filter((itm) => itm.status === "FILLED" && itm.label === "TP");

      if (!!SLOrdersFind && SLOrdersFind.length > 0 && !strategySessions.SLClosed && !!TPOrdersFind && TPOrdersFind.length > 0 && !strategySessions.TPClosed) {

         strategySessions.SLClosed = true;
         strategySessions.TPClosed = true;
         console.debug('checkClose 431 find SL FILLED and TP FILLED contemporary');

         if (!strategySessions.checkLevel3Triggered) {

            if (strategySessions.checkLevelForCheckClose) {
               await CalculateProfit("TP and SL contemporary reached");
               stopKCount();
               console.debug("stopKCount in strategy-functions: 459");
            }

            // condizione in cui strategySessions.checkLevelForCheckClose = false
            else {
               await CalculateProfit("Far TP and SL contemporary reached");
               startkCount(settings.stopBotFor);
               console.debug("startKCount in strategy-functions: 466");
            }
         }

         // condizione in cui strategySessions.checkLevel3Triggered = true
         else {
            await CalculateProfit("EntryPrice TP and far SL contemporary reached");
            startkCount(settings.stopBotFor);
            console.debug("startKCount in strategy-functions: 474");
         }
         await cancelAllOrdersAndReset("checkClose SL and TP contemporary reached");
      }

      else if (SLOrdersFind && SLOrdersFind.length > 0 && !strategySessions.SLClosed) {

         strategySessions.SLClosed = true;
         console.debug('checkClose 452 find SL FILLED');

         if (!strategySessions.checkLevel3Triggered) {

            if (strategySessions.checkLevelForCheckClose) {
               await CalculateProfit("Near SL reached");
               stopKCount();
               console.debug("stopKCount in strategy-functions: 487");
            }

            // condizione in cui strategySessions.checkLevelForCheckClose = false
            else {
               await CalculateProfit("Far SL reached");
               startkCount(settings.stopBotFor);
               console.debug("startKCount in strategy-functions: 496");
            }
         }

         // condizione in cui strategySessions.checkLevel3Triggered = true
         else {
            await CalculateProfit("Far SL reached");
            startkCount(settings.stopBotFor);
            console.debug("startKCount in strategy-functions: 503");
         }
         await cancelAllOrdersAndReset("checkClose SL reached");
      }

      else if (TPOrdersFind && TPOrdersFind.length > 0 && !strategySessions.TPClosed) {

         strategySessions.TPClosed = true;
         console.debug('checkClose 481 find TP FILLED');

         if (!strategySessions.checkLevel3Triggered) {
            await CalculateProfit("TP reached");
            stopKCount();
            console.debug("stopKCount in strategy-functions: 512");
         }

         // condizione in cui strategySessions.checkLevel3Triggered = true
         else {
            await CalculateProfit("EntryPrice TP reached");
            startkCount(settings.stopBotFor);
            console.debug("startKCount in strategy-functions: 524");
         }
         await cancelAllOrdersAndReset("checkClose TP reached");
      }
   }
}

/*
verifica se c'è una posizione aperta da sola senza altri openOrders e la chiude immediatamente perchè orfana, derivante quindi da un anomalia della strategia sfuggita al controllo
*/
export async function checkOpen() {

   // è stato avviato un reset
   if (strategySessions.lastResetTime != -1) {
      const now = (new Date()).getTime();
      const difference = now - strategySessions.lastResetTime;
      let SLOpenOrder = strategySessions.openOrders.findIndex((opn) => opn.stopPrice > 0);
      let SLFilledOrder = strategySessions.currentOrders.findIndex((filSL) => filSL.label == "SL" && filSL.status == "FILLED");
      let TPFilledOrder = strategySessions.currentOrders.findIndex((filTP) => filTP.label == "TP" && filTP.status == "FILLED");
      const OrderOpenedInCurrent = strategySessions.currentOrders.findIndex(xo => xo.status === 'NEW');

      // se esiste un ordine aperto in current order non non c'è negli open order 
      // vuol dire che si sta componendo l'array 
      const oredrInComposition = strategySessions.openOrders.length == 0 && OrderOpenedInCurrent >= 0;

      // se entrambi gli array current orders
      const bothEmpty = strategySessions.openOrders.length == 0 && strategySessions.currentOrders.length == 0;

      if (strategySessions.positionInfo.entryPrice > 0) {

         if (oredrInComposition) {
            // l'array openOrder è in costruziione
            oredrInComposition ? console.debug('checkOpen array open [] but new order is in current orders') : null;
            //bothEmpty ? console.debug('both current orders and open orders are empty') : null ;
            strategySessions.lastResetTime = (new Date()).getTime();
            return;
         }

         if (SLOpenOrder == -1 || SLFilledOrder >= 0 || TPFilledOrder >= 0 || bothEmpty) {

            console.debug('difference from laste reset check open ', difference);
            // se sono passati più di 30 secondi dall'ultimo reset
            if (difference >= 20000) {
               strategySessions.lastResetTime = -1;
               await ErrorMessage("500");
               console.info("checkOpen: difference , Entry price, open orders lenght ", difference, strategySessions.positionInfo.entryPrice, strategySessions.openOrders.length);
               strategySessions.lastResetTime = -1;
            }
         }
      }
   }
}

export async function cancelProtections() {

   let TPOrders = strategySessions.currentOrders.filter((itm) => itm.label == "TP" && itm.status != "FILLED");
   let SLOrders = strategySessions.currentOrders.filter((itm) => itm.label == "SL" && itm.status != "FILLED");
   strategySessions.lastResetTime = (new Date()).getTime();

   if (!!TPOrders && TPOrders.length > 0) {

      for (let i = 0; i < TPOrders.length; i++) {
         strategySessions.lastResetTime = (new Date()).getTime();
         await cancelOrder(TPOrders[i].orderId);
      }
      console.debug(`cancelProtections 631, TP canceled`);
   }

   if (!!SLOrders && SLOrders.length > 0) {

      for (let i = 0; i < SLOrders.length; i++) {
         strategySessions.lastResetTime = (new Date()).getTime();
         await cancelOrder(SLOrders[i].orderId);
      }
      console.debug(`cancelProtections 639, SL canceled`);
   }

   strategySessions.protectionInserted = false;
}

export async function CancelLevelsOverProtections(settings) {
   try {
      if (strategySessions.positionInfo.entryPrice > 0) {

         let TPOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "TP");
         let SLOrder = strategySessions.currentOrders.findIndex((itm) => itm.label === "SL");
         let TPOrderLevel;
         let TPOrderId;
         let SLOrderLevel;
         let SLOrderId;
         let resizeProtection = false;

         if (TPOrder !== -1) {
            TPOrderLevel = strategySessions.currentOrders[TPOrder].level;
            TPOrderId = strategySessions.currentOrders[TPOrder].orderId;
         }

         if (SLOrder !== -1) {
            SLOrderLevel = strategySessions.currentOrders[SLOrder].stopPrice;
            SLOrderId = strategySessions.currentOrders[SLOrder].orderId;
         }

         if (TPOrder == -1 || SLOrder == -1) {
            return null;
         }

         if (strategySessions.positionInfo.positionSide == "BUY") {

            for (let i = 0; i < strategySessions.openOrders.length; i++) {
               const itemOrder = strategySessions.openOrders[i];

               if (itemOrder.price > 0) {

                  if (itemOrder.price < SLOrderLevel || itemOrder.price > TPOrderLevel) {
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(itemOrder.orderId);
                     resizeProtection = true;
                  }
               }
            }
            if (resizeProtection) {
               await cancelProtections();
               await CalculateAndInsertProtections(settings);
               console.debug("protection inserterd at strategy-function: 616");
               console.debug(`CancelLevelsOverProtections 688, reinsert protection`);
               resizeProtection = false;
            }
         }

         else if (strategySessions.positionInfo.positionSide == "SELL") {

            for (let i = 0; i < strategySessions.openOrders.length; i++) {
               const itemOrder = strategySessions.openOrders[i];

               if (itemOrder.price > 0) {

                  if (itemOrder.price > SLOrderLevel || itemOrder.price < TPOrderLevel) {
                     strategySessions.lastResetTime = (new Date()).getTime();
                     await cancelOrder(itemOrder.orderId);
                     resizeProtection = true;
                  }
               }
            }
            if (resizeProtection) {
               await cancelProtections();
               await CalculateAndInsertProtections(settings);
               console.debug("protection inserterd strategy-function: 638");
               console.debug(`CancelLevelsOverProtections 712, reinsert protection`);
               resizeProtection = false;
            }
         }
      }
   } catch (err) {
      console.error(err);
   }
}

// funzione che verifica se pdi e mdi sono interni al range di confidenza 9,40, se sono esterni tale funzione ritorna false
export function checkActive2(settings, dmxIndicator, bDmiSize) {

   for (let i = 0; i < settings.stopBotFor; i++) {
      //console.debug(`pdi_${i}: ${dmxIndicator[bDmiSize - i].pdi}`);
      //console.debug(`mdi_${i}: ${dmxIndicator[bDmiSize - i].mdi}`);
      if (dmxIndicator[bDmiSize - i].pdi >= settings.limDMIMax || dmxIndicator[bDmiSize - i].pdi <= settings.limDMIMin) {
         return false;
      }
      if (dmxIndicator[bDmiSize - i].mdi >= settings.limDMIMax || dmxIndicator[bDmiSize - i].mdi <= settings.limDMIMin) {
         return false;
      }
   }
   return true;
}

// funzione che verifica quale ordine è entrato in posizione
export async function checkOrderTriggered() {

   let orderTriggered = 0;

   if (strategySessions.positionInfo.entryPrice > 0) {

      // ottiene la lista degli ordini dalla sessione in modo da evitare le continue chianate
      if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0) {

         if (strategySessions.positionInfo.positionSide == "BUY") {

            let triggeredOpenOrdersBuy = strategySessions.currentOrders.filter((itm) => itm.status === 'FILLED' && itm.side === "BUY" && (itm.label == "1" || itm.label == "2" || itm.label == "3"));

            if (triggeredOpenOrdersBuy && triggeredOpenOrdersBuy.length > 0) {
               orderTriggered = triggeredOpenOrdersBuy.length;
            }
         }
         else if (strategySessions.positionInfo.positionSide == "SELL") {

            let triggeredOpenOrdersSell = strategySessions.currentOrders.filter((itm) => itm.status === 'FILLED' && itm.side === "SELL" && (itm.label == "1" || itm.label == "2" || itm.label == "3"));

            if (triggeredOpenOrdersSell && triggeredOpenOrdersSell.length > 0) {
               orderTriggered = triggeredOpenOrdersSell.length;
            }
         }
      }
   }
   return orderTriggered;
}

// funzione che verifica se è entrato l'ordine a Mid Bollinger Band che è identificato da label MB
export async function checkMBTriggered() {

   let MBTriggered = false;

   if (strategySessions.positionInfo.entryPrice > 0) {

      // ottiene la lista degli ordini dalla sessione in modo da evitare le continue chianate
      if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0) {

         let MBOrders = strategySessions.currentOrders.filter((itm) => itm.status === 'FILLED' && itm.label == "MB");

         if (MBOrders && MBOrders.length > 0) {
            MBTriggered = true;
         }
      }
   }
   return MBTriggered;
}

// funzione che verifica elimina l'ordine MB preinserito
export async function cancelMBOrder() {

   let MBOrders = strategySessions.currentOrders.filter((itm) => itm.label == "MB" && itm.status != "FILLED");

   if (!!MBOrders && MBOrders.length > 0) {

      for (let i = 0; i < MBOrders.length; i++) {
         strategySessions.lastResetTime = (new Date()).getTime();
         await cancelOrder(MBOrders[i].orderId);
      }
      console.debug(`cancelMBOrder 832, MB canceled`);
   }
   strategySessions.MBOrderInserted = false;
}

// funzione che verifica ed elimina l'ordine TP preinserito
export async function cancelTPOrder() {

   let TPOrders = strategySessions.currentOrders.filter((itm) => itm.label == "TP" && itm.status != "FILLED");

   if (!!TPOrders && TPOrders.length > 0) {

      for (let i = 0; i < TPOrders.length; i++) {
         strategySessions.lastResetTime = (new Date()).getTime();
         await cancelOrder(TPOrders[i].orderId);
      }
      console.debug(`canceTPOrder 814, TP canceled`);
   }
}

// funzione che resetta tutte le variabili una volta avvenuta la chiusura a TP o SL
export const variableReset = async () => {
   console.debug("variableReset 767");
   try {
      strategySessions.messageSent_1 = false;
      strategySessions.messageSent_2 = false;
      strategySessions.messageSent_active2 = false;
      strategySessions.messageSent_active3 = false;
      strategySessions.messageSent_4 = false;
      strategySessions.messageSent_5 = false;
      strategySessions.messageSent_6 = false;
      strategySessions.messageSent_7 = false;
      strategySessions.messageSent_8 = false;
      strategySessions.messageSent_9 = false;
      strategySessions.prevOrderTriggered = 0;
      strategySessions.orderTriggered = 0;
      strategySessions.levelTriggered = false;
      strategySessions.checkLevelTriggered = false;
      strategySessions.check1LevelTriggered = false;
      strategySessions.check2LevelTriggered = false;
      strategySessions.checkLevel3Triggered = false;
      strategySessions.MBTriggerd = false;
      strategySessions.MBOrderInserted = false;
      strategySessions.TPOrderInserted = false;
      strategySessions.check1Level = 0;
      strategySessions.check2Level = 0;
      timer.stop();
      timerMBOrder.stop();
      timerTPOrder.stop();
      strategySessions.balance = -1;
      strategySessions.checkLevelForCheckClose = false;
      strategySessions.statusSTARTActive = false;
      strategySessions.startLevel = -1;
      strategySessions.startSide = 'BOTH';
      strategySessions.protectionInserted = false;
      strategySessions.positionAmountClosedToMB = -1;
      strategySessions.dmiTriggered = false;
      strategySessions.SLPriceBuyAtStart = -1;
      strategySessions.SLPriceSellAtStart = -1;
      resetOrderFilter();
      await cancelAllDBOrders();
      strategySessions.currentOrders = await updateOpenOrders();
   } catch (err) {
      console.err(err);
   }
}

/**
 * Calcola il balance dell'account connesso
 * 
 * @returns {Number}
 */
export const calculateBalance = async () => {
   try {
      const accountInfo = await bInstance.accountInfo();

      if (accountInfo.assets && accountInfo.assets.length > 0) {

         const balance = accountInfo.assets.find(({ asset }) => asset === 'USDT');
         if (balance) {
            const { walletBalance } = balance;
            return walletBalance;
         }
      }
   } catch (err) {
      console.error(err);
   }
   return -1;
}

export async function CalculateProfit(mode) {

   await forcePositionInfo();

   let finalBalance = await calculateBalance();
   let netProfit = Number(finalBalance) - Number(strategySessions.balance);
   //let netprofitPercent = (Number(netProfit) / Number(strategySessions.balance) * 100).toFixed(4);
   let closedAmount = Number(strategySessions.positionAmountClosedToMB).toFixed(strategySessions.symbolSettings.qtyPrecision);
   let SLOrdersFind = strategySessions.currentOrders.findIndex((itm) => itm.status === "FILLED" && itm.label === "SL");
   let TPOrdersFind = strategySessions.currentOrders.findIndex((itm) => itm.status === "FILLED" && itm.label === "TP");
   let TPOrderSize;
   let SLOrderSize;

   if (TPOrdersFind !== -1) {
      TPOrderSize = strategySessions.currentOrders[TPOrdersFind].quantity;
   }

   if (SLOrdersFind !== -1) {
      SLOrderSize = strategySessions.currentOrders[SLOrdersFind].quantity;
   }

   if (mode == "Mid Bollinger Band" && strategySessions.positionInfo.entryPrice > 0) {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.thumbsup} ${emoji.emoji.white_check_mark} Price close to mid band. Closing 50% position and moving stop loss to entry price.\n
      entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      position: ${Number(strategySessions.positionInfo.positionAmount)}\n
      closed amount: ${Number(closedAmount)}\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.thumbsup} ${emoji.emoji.white_check_mark} Price close to mid band. Closing 50% position and moving stop loss to entry price.\n
      entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      position: ${Number(strategySessions.positionInfo.positionAmount)}\n
      closed amount: ${Number(closedAmount)}\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Level 3 reached" && strategySessions.positionInfo.entryPrice > 0) {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.warning} ${emoji.emoji.warning} Loss reached. Creating limit close order at entry price.\n
      entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.warning} ${emoji.emoji.warning} Loss reached. Creating limit close order at entry price.\n
      entry price: ${Number(strategySessions.positionInfo.entryPrice).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "TP and SL contemporary reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band and Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);

      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band and Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Far TP and SL contemporary reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band and far Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band and far Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "EntryPrice TP and far SL contemporary reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Entry price and far Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Entry price and far Stop Loss contemporary. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Near SL reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sweat_smile} ${emoji.emoji.sweat_smile} Stop loss.`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sweat_smile} ${emoji.emoji.sweat_smile} Stop loss.`);
      }
   }
   else if (mode == "Far SL reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sob} ${emoji.emoji.money_with_wings} Stop Loss filled.\n
      size: ${Number(SLOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sob} ${emoji.emoji.money_with_wings} Stop Loss filled.\n
      size: ${Number(SLOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "TP reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.white_check_mark} ${emoji.emoji.white_check_mark} Price close to Opposite band. Closing position.\n
      size: ${Number(TPOrderSize)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "EntryPrice TP reached") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sweat_smile} ${emoji.emoji.sweat_smile} Close a entry price.`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.sweat_smile} ${emoji.emoji.sweat_smile} Close a entry price.`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Out DMI unrealizedPnL <= 0") {
      if (netProfit >= 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} DI out of range. Closing position with unrealizedPnL <= 0.\n
      size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} DI out of range. Closing position with unrealizedPnL <= 0.\n
      size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Out DMI unrealizedPnL > 0") {
      if (netProfit >= 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} DI out of range. No Closing Position!.\n
      size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
      else {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} DI out of range. No Closing Position!.\n
      size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
      close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
      ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }
   }
   else if (mode == "Out DMI entryPrice = 0") {
      sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} DI out of range. Closing orders`);
   }
   else if (mode == "Position closed by user") {
      if (netProfit > 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} Position closed by user.\n
         size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
         close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
         ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //profit: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }

      else if (netProfit < 0) {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} Position closed by user.\n
         size: ${Number(strategySessions.positionInfo.positionAmount)} lots\n
         close price: ${Number(strategySessions.currentClosePrice).toLocaleString()} ${strategySessions.defaultCurrency}\n
         ${emoji.emoji.moneybag} balance: ${Number(finalBalance).toLocaleString()} ${strategySessions.defaultCurrency}`);
         //loss: ${Number(netProfit).toLocaleString()} ${strategySessions.defaultCurrency}`);
      }

      else {
         sendMessage(strategySessions.chatId, `${emoji.emoji.tired_face} ${emoji.emoji.tired_face} Closed by user.`);
      }
   }
}

export async function ErrorMessage(errorNumber) {
   await forcePositionInfo();

   console.error(`error at row ${errorNumber} encountered`);
   strategySessions.lastResetTime = (new Date()).getTime();

   if (strategySessions.positionInfo.entryPrice > 0) {
      /// posizione aperta chiudila e resetta tutto
      await insertPartialClose(100);
      await cancelAllOrders();
      await variableReset();
   }
   else {
      /// non ci sono prosizioni se ci sono più di 6 current orders elimina tutto e ricomenicia
      await updateOpenOrders();
      const openOrders = strategySessions.openOrders;
      if (openOrders.length != 6) {
         await cancelAllOrders();
         await variableReset();
      }
   }
   //await CalculateProfit("Error message");
   console.debug("Resetting for error !!!, strategy-functions: 1023");
   console.debug("stopKCount in strategy-functions: 1023");
   strategySessions.lastResetTime = (new Date()).getTime();
}

export async function checkStartLevel(settings) {
   let BuyLevelPrice1 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent1 / 100));
   let BuyLevelPrice2 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent2 / 100));
   let BuyLevelPrice3 = strategySessions.bollinger.lower * (1 + (settings.longTradePricePercent3 / 100));
   let SellLevelPrice1 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent1 / 100));
   let SellLevelPrice2 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent2 / 100));
   let SellLevelPrice3 = strategySessions.bollinger.upper * (1 + (settings.shortTradePricePercent3 / 100));

   if (strategySessions.currentClosePrice > SellLevelPrice3) {
      strategySessions.startLevel = 3;
      strategySessions.startSide = "SELL";
   }
   else if (strategySessions.currentClosePrice > SellLevelPrice2 && strategySessions.currentClosePrice <= SellLevelPrice3) {
      strategySessions.startLevel = 2;
      strategySessions.startSide = "SELL";
   }
   else if (strategySessions.currentClosePrice > SellLevelPrice1 && strategySessions.currentClosePrice <= SellLevelPrice2) {
      strategySessions.startLevel = 1;
      strategySessions.startSide = "SELL";
   }
   else if (strategySessions.currentClosePrice >= BuyLevelPrice1 && strategySessions.currentClosePrice <= SellLevelPrice1) {
      strategySessions.startLevel = 0;
      strategySessions.startSide = "BOTH";
   }
   else if (strategySessions.currentClosePrice < BuyLevelPrice1 && strategySessions.currentClosePrice >= BuyLevelPrice2) {
      strategySessions.startLevel = 1;
      strategySessions.startSide = "BUY";
   }
   else if (strategySessions.currentClosePrice < BuyLevelPrice2 && strategySessions.currentClosePrice >= BuyLevelPrice3) {
      strategySessions.startLevel = 2;
      strategySessions.startSide = "BUY";
   }
   else if (strategySessions.currentClosePrice < BuyLevelPrice3) {
      strategySessions.startLevel = 3;
      strategySessions.startSide = "BUY";
   }
}

export async function closePositionCancelAllOrdersAndReset(log) {
   console.debug(`closePositionCancelAllOrdersAndReset 1038, log: ${log}`);
   await insertPartialClose(100);
   await cancelAllOrders();
   await variableReset();
   strategySessions.lastResetTime = new Date().getTime();
}

export async function cancelAllOrdersAndReset(log) {
   console.debug(`cancelAllOrdersAndReset 1045, log: ${log}`);
   strategySessions.lastResetTime = (new Date()).getTime();
   await cancelAllOrders();
   await variableReset();
}

export async function forcePositionInfo() {
   const posInfo = await getPositionInfo();
   if (posInfo) {
      strategySessions.positionInfo.unrealizedPnL = posInfo.unRealizedProfit;
      strategySessions.positionInfo.entryPrice = posInfo.entryPrice;
      strategySessions.positionInfo.positionAmount = posInfo.positionAmt;
   }

   // questo ciclo riassegna il posizionside in funzione dell'amount della positionInfo in corsa, infatti positionInfo < 0 equivalgono a position di SELL
   if (strategySessions.positionInfo.positionAmount > 0) {
      strategySessions.positionInfo.positionSide = 'BUY';
   }
   else if (strategySessions.positionInfo.positionAmount < 0) {
      strategySessions.positionInfo.positionSide = 'SELL';
   }
   else strategySessions.positionInfo.positionSide = 'BOTH';
}

export async function realizedProfit() {
   const dataInfo = await getDataInfo();
   const endTime = (new Date()).getTime();

   // cerca solo tra gli ordini con timestamp > strategySessions.startTime && timespamp <= endTime
   if (dataInfo) {
      for (let i = 0; i < dataInfo.length; i++) {

      }
   }
}