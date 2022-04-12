import { parentPort } from "worker_threads";
import { ordersBookRepo } from "../../repository/ordersbook-repository.js";
import { bInstance, strategySessions } from '../strategy-mod.js';
import { Console as console } from '../logger-mod.js';

let prevOrderLenght = 0;


/**
 * Invia un ordine multiplo di Buy
 *
 * @param {number} buyPrice1
 * @param {number} buyPrice2
 * @param {number} buyPrice3
 */
export const insertMulpleOrderBuy = async (buyPrice1, buyPrice2, buyPrice3) => {
   try {
      console.debug(`insertMulpleOrderBuy buyPrice1: ${buyPrice1}, buyPrice2: ${buyPrice2}, buyPrice3: ${buyPrice3}`);
      const orders = await bInstance.insertMulpleOrderBuy(buyPrice1, buyPrice2, buyPrice3);
      ////await updateOpenOrders();
      return orders;
   } catch (err) {
      console.error(err);
   }

   return [];
};
/**
 * Inserisci ordini multipli di sell
 *
 * @param {number} sellPrice1
 * @param {number} sellPrice2
 * @param {number} sellPrice3
 */
export const insertMulpleOrderSell = async (sellPrice1, sellPrice2, sellPrice3) => {
   try {
      console.debug(`insertMulpleOrderSell sellPrice1: ${sellPrice1}, sellPrice2: ${sellPrice2}, sellPrice3: ${sellPrice3}`);
      const orders = await bInstance.insertMulpleOrderSell(sellPrice1, sellPrice2, sellPrice3);
      ////await updateOpenOrders();
      return orders;
   } catch (err) {
      console.error(err);
   }

   return [];
};

export const cancelAllDBOrders = async () => {
   try {
      console.debug("cancelAllDBOrders");
      const result = await bInstance.cancelAllDbOrders();
      return result;
   } catch (err) {
      console.error(err);
   }
   return false;
};

export const cancelAllOrders = async () => {
   try {
      recalibrateOrderFilter();
      console.debug("cancelAllOrders");
      const result = await bInstance.cancelAllOrders();
      strategySessions.currentOrders = await updateOpenOrders();
      return result;
   } catch (err) {
      console.error(err);
   }
   return false;
};

export const cancelOpenedMultiOrders = async (side) => {
   try {
      recalibrateOrderFilter();
      console.debug(`cancelOpenedMultiOrders side: ${side}`);
      const order = await bInstance.cancelOpenedMultiOrders(side);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;

};
/**
 * Chiama il thred principale per eseguire l'inser dell'ordine parziale
 */
export const insertPartialClose = async (closePercent) => {
   try {
      console.debug(`insertPartialClose closePercent: ${closePercent}`);
      const order = await bInstance.insertOrderPartialClose(strategySessions.positionInfo, closePercent);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};
/**
 * Inserisce  ordini a protezuione
 *
 * @param {number} stopLoss
 * @param {number} takeProfit
 */
export const insertOrderProtection = async (stopLoss, takeProfit, amountLotsSL, amountLotsTP) => {
   try {
      console.debug(`insertOrderProtection stopLoss: ${stopLoss}, takeProfit: ${takeProfit}`);
      const order = await bInstance.insertOrderProtection(strategySessions.positionInfo, stopLoss, takeProfit, amountLotsSL, amountLotsTP);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};

export const insertSLOrder = async (stopLoss, amountLotsSL) => {
   try {
      console.debug(`insertSLOrder stopLoss: ${stopLoss}`);
      const order = await bInstance.insertSLOrder(strategySessions.positionInfo, stopLoss, amountLotsSL);
      console.debug("insert SL Order Result:",order);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
}

export const insertTPOrder = async (takeProfit, amountLotsTP) => {
   try {
      console.debug(`insertTPOrder takeProfit: ${takeProfit}`);
      const order = await bInstance.insertTPOrder(strategySessions.positionInfo, takeProfit, amountLotsTP);
      console.debug("insert TP Order Result:",order);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
}

export const insertMBOrder = async (midBollingerBand, amountLotsMB) => {
   try {
      console.debug(`insertMBOrder midBollingerBand: ${midBollingerBand}`);
      const order = await bInstance.insertMBOrder(strategySessions.positionInfo, midBollingerBand, amountLotsMB);
      console.debug("insert MB Order Result:",order);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
}

/**
 * Invia un messaggio di telegram
 *
 * @param {number} chatId
 * @param {string} message
 */
export const sendMessage = (chatId, message) => {
   parentPort.postMessage({
      msg: "update",
      type: "sendMessage",
      chatId,
      message
   });
};
export const setMinLotSize = (minNotional, kclosePrice, qtyPrecision) => {
   if (strategySessions.minLotSize === -1) {
      strategySessions.minLotSize = Math.ceil((minNotional / kclosePrice) * (10 ** qtyPrecision)) / (10 ** qtyPrecision);
      console.info("setMinLotSize ",strategySessions.minLotSize);
      bInstance.symbolSettings.minLotSize = strategySessions.minLotSize;

      parentPort.postMessage({
         msg: "update",
         type: "setMinLotSize",
         value: strategySessions.minLotSize
      });
   }
};
/**
 * Ottiene i dati della position
 */
export const getPositionInfo = async () => {
   try {
      //console.debug("getPositionInfo");
      const pInfo = await bInstance.getPositionInfo();

      return pInfo;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};
/**
 *
 * @returns
 */
export const listHistoryOrders = async () => {
   try {
      console.debug("listOpenOrders");
      const pOpenOrders = await bInstance.binanceOrderList(100);

      return pOpenOrders;
   }
   catch (err) {
      console.error(err);
   }
   return [];

};
export const listOpenOrders = async () => {
   try {
      console.debug("listOpenOrders");
      const pOpenOrders = await bInstance.listOpenOrders();

      return pOpenOrders;
   }
   catch (err) {
      console.error(err);
   }
   return [];

};
export const cancelOrder = async (orderId) => {
   try {
      recalibrateOrderFilter();
      console.debug(`cancelOrder orderId: ${orderId}`);
      const pOpenOrders = await bInstance.cancelOrder(orderId);

      return pOpenOrders;
   }
   catch (err) {
      console.error(err);
   }
   return [];
};

export const insertOrderSellLimit = async (quantity, level, label) => {
   try {
      console.debug(`insertOrderSellLimit quantity: ${quantity}, level: ${level}, label: ${label}`);
      const order = await bInstance.insertOrderSellLimit(quantity, level, label);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};

export const insertOrderBuyLimit = async (quantity, level, label) => {

   try {
      console.debug(`insertOrderBuyLimit quantity: ${quantity}, level: ${level}, label: ${label}`);
      const order = await bInstance.insertOrderBuyLimit(quantity, level, label);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};

export const insertOrderSellMarket = async (quantity, label) => {
   try {
      console.debug(`insertOrderSellMarket quantity: ${quantity}, label: ${label}`);
      const order = await bInstance.insertOrderSellMarket(quantity, label);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};

export const insertOrderBuyMarket = async (quantity, label) => {

   try {
      console.debug(`insertOrderBuyMarket quantity: ${quantity}, label: ${label}`);
      const order = await bInstance.insertOrderBuyMarket(quantity, label);
      strategySessions.currentOrders = await updateOpenOrders();
      return order;
   }
   catch (err) {
      console.error(err);
   }
   return null;
};

const readSettings = async (symbol) => {
   try {
      console.debug(`readSettings: ${symbol}`);
      const settings = await bInstance.loadSettings(symbol);

      return settings;
   } catch (err) {
      console.error(err);
   }

   return null;
};

/**
 * Aggiorna l'array degli ormini con l'ordine passato come argomento
 * 
 * @param {orders} itm 
 */
export const updateOpenOrders = async () => {
   let outorders = [];
   let orders = [];
   try {
      try {
         orders = await bInstance.client.futuresAllOrders(strategySessions.symbol, {
            orderId: strategySessions.orderFilter
         });

         //console.debug("orders object ",orders);
         if (!orders || !orders.filter) {
            strategySessions.lastResetTime = (new Date()).getTime();
            return [];
         }
      } catch (err) {
         //console.error(err);
         strategySessions.lastResetTime = (new Date()).getTime();
         orders = [];
      }

      if (orders) {
         if (orders.length != prevOrderLenght) {
            console.debug(`futuresAllOrders total analyzed (max 1000): ${orders.length}`);
            prevOrderLenght = orders.length;
         }
      }

      const currentOrders = orders.filter((t) => t.status == 'FILLED' || t.status == 'NEW');

      for (let i = 0; i < currentOrders.length; i++) {
         const itm = currentOrders[i];
         let label = '';
         //console.debug('itm order to insert ',itm);
         if (strategySessions.chatId > 0) {
            const dbOrder = await ordersBookRepo.findOne(strategySessions.chatId, itm.orderId);
            if (dbOrder && dbOrder.label) {
               label = dbOrder.label
            }
         }

         outorders.push({
            orderId: itm.orderId,
            status: itm.status || itm.orderStatus,
            quantity: itm.quantity || itm.origQty,
            type: itm.type || itm.origType,
            label: itm.label || label,
            side: itm.side,
            symbol: itm.symbol,
            level: itm.price,
            stopPrice: itm.stopPrice
         });
      }
      strategySessions.currentOrders  = outorders;
      await getOpenOrdersOnly();

      return outorders;
   } catch (err) {
      console.error(err);
      // setTimeout(async () => await updateOpenOrders(), 1000);
   }

   return strategySessions.currentOrders;
}

/**
 * porta l'indice dei ifiltri dell'ordine all'id dell'ordine più alto 
 * e serve per resttare l'array ordini filled compresi
 */
export const resetOrderFilter = () => {
   try {
      if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0) {
         let maxOrder = Number.MIN_VALUE;

         for (let i = 0; i < strategySessions.currentOrders.length; i++) {
            const ord = strategySessions.currentOrders[i];
            if (ord.orderId > maxOrder) {
               maxOrder = ord.orderId;
            }
         }

         strategySessions.orderFilter = maxOrder + 1;
         console.debug(`resetOrderFilter 388 set orderFilter to (max+1): ${strategySessions.orderFilter}`);
      }
   }
   catch (err) {
      console.error(err);
   }
}

/**
 * Porta l'indce del orderFilter all'id dell'ordine piu basso
 * 
 */
const recalibrateOrderFilter = () => {
   try {
      if (strategySessions.currentOrders && strategySessions.currentOrders.length > 0) {
         let minOrder = Number.MAX_VALUE;

         for (let i = 0; i < strategySessions.currentOrders.length; i++) {
            const ord = strategySessions.currentOrders[i];
            if (ord.orderId < minOrder) {
               minOrder = ord.orderId;
            }
         }

         strategySessions.orderFilter = minOrder;
         console.debug(`recalibrateOrderFilter 388 set orderFilter to: ${minOrder}`);
      }
   }
   catch (err) {
      console.error(err);
   }
} 

/**
 * Ottiene solo gli ordini aperti
 */
async function getOpenOrdersOnly() {
   try {
      strategySessions.openOrders = await bInstance.client.futuresOpenOrders(strategySessions.symbol);

   } catch (err) {
      strategySessions.lastResetTime = (new Date()).getTime();
      try {
         if (strategySessions.openOrders && !strategySessions.openOrders.length) {
            // contiene un messaggio di errore 
            await bInstance.client.useServerTime(async () => {
               console.debug('server time aligned !!');
               strategySessions.openOrders = await bInstance.client.futuresOpenOrders(strategySessions.symbol);
            });
         }
      } catch (err) {
         console.error(err);
         strategySessions.lastResetTime = (new Date()).getTime();
         strategySessions.openOrders =[];
      }
   }
}
