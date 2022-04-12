/// docs https://github.com/jaggedsoft/node-binance-api

import Indicators from 'technicalindicators';
import Binance from "node-binance-api";
import { enviorments } from "./properties-mod.js";
import EventEmitter from 'events';
import { settingsRepo } from '../repository/settings-repository.js';
import { ordersBookRepo } from '../repository/ordersbook-repository.js';
import { runBinanceWorker } from './binance-worker-mod.js';
import { authCodesRepo } from '../repository/authcodes-repository.js';
import { Console as console } from './logger-mod.js';

const { binanceFeauturesMarket } = enviorments();

const orderSIde = {
  BUY: 'BUY',
  SELL: 'SELL'
}

const orderType = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  STOP_LOSS: 'STOP_LOSS',
  STOP: 'STOP',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT'
}

const defaultsSettings = {
  feesMax: 0.1,
  levaMax: 4,
  timeFrame: '5m',
  smartTakeProfit: 1,
  stopLossPercent: 7,
  takeProfitPercent: 0.25,
  startLevelPercent: 1,
  timeOorderExpiration: 30,
  stopBotFor: 6,
  shortTradePricePercent1: -0.2,
  shortTradePricePercent2: 0.2,
  shortTradePricePercent3: 5,
  shortOrderAmount1: 200,
  shortOrderAmount2: 200,
  shortOrderAmount3: 500,
  longTradePricePercent1: 0.2,
  longTradePricePercent2: -0.2,
  longTradePricePercent3: -5,
  longOrderAmount1: 200,
  longOrderAmount2: 200,
  longOrderAmount3: 500
}
export default class BinanceTrading {

  // L' APPKEY e il SECRET KEY dei fetures sono diversi da quelli di spot
  // se impostato test=true vengono switchati solo i feutures su testnet 
  // per lo spot bisogna iance impostare le urls della testnet
  client = new Binance();

  // indica se il service dalla strategia e' su
  strategyUp = false;

  worker = null;

  symbolSettings = {
    pricePrecision: 2,
    qtyPrecision: 3,
    name: '',
    minNotional: '10',
    minLotSize: null
  }

  strategyPeriods = {
    bollinger: 20,
    adx: 14,
    stdDev: 2.0
  }
  events = new EventEmitter();
  initError = false;
  attacedError = false;

  constructor(chat = { id: -1 }) {
    try {
      this.chat = chat;
      this.initError = false;
      this.defaultCurrency = 'USDT';

      this.getDefaultCurrencyFromAccount();

      const strategyPeriods = this.strategyPeriods;
      // imposta i settings di default
      this.settings = {
        chatId: chat.id,
        pair: null,
        ...defaultsSettings,
        ...strategyPeriods,
        balanceCurrency: 'USDT'
      }
      // carica dal db i dati

      // inizializza le options
      this.updateBinanceOption();
    }
    catch (err) {
      console.error(err);
      this.initError = true;
    }
  }

  updateBinanceOption() {
    if (this.client) {
      const bOpt = {};
      bOpt.test = binanceFeauturesMarket.test;
      bOpt.APIKEY = binanceFeauturesMarket.apikey;
      bOpt.APISECRET = binanceFeauturesMarket.apiSecret;
      bOpt.reconnect = true;
      bOpt.verbose = binanceFeauturesMarket.test;
      bOpt.keepAlive = true;
      bOpt.useServerTime = true;
      bOpt.recvWindow = 60000;
      bOpt.verbose = true;
      bOpt.future_margin_call_callback = this.margin_update_callback.bind(this);
      bOpt.future_account_update_callback = this.balance_update_callback.bind(this);
      bOpt.future_order_update_callback = this.order_update_callback.bind(this);

      bOpt.log = log => {
        console.debug(log);
      }

      this.client.options(bOpt);
    }
  }

  async getDefaultCurrencyFromAccount() {
    const defaultAccount = await authCodesRepo.findDefaultAccount();

    if (defaultAccount && defaultAccount.binanceAccount) {
      binanceFeauturesMarket.test = defaultAccount.binanceTestnet;
      binanceFeauturesMarket.apikey = defaultAccount.binanceApiKey;
      binanceFeauturesMarket.apiSecret = defaultAccount.binanceSecret;

      if (defaultAccount.defaultCurrency) {
        this.defaultCurrency = defaultAccount.defaultCurrency;
      }
    }
    this.updateBinanceOption();
    return this.defaultCurrency;
  }

  off(target, _callback) {
    try {
      if (_callback) {
        this.events.off(target, _callback);
      }
      else {
        this.events.off(target);
      }
    } catch (err) {
      console.error(err);
    }
  }

  on(target, _callback) {
    try {
      this.events.on(target, _callback.bind(this));
    }
    catch (err) {
      console.error(err);
    }
  }

  /**
   * Ottiene l'unrealized profit
   * @returns 
   */
  async getPositionInfo() {
    try {
      const profit = await this.client.futuresPositionRisk({
        symbol: this.settings.pair
      });
      const positionInfo = profit && profit.length > 0 ? profit[0] : -1;

      if (this.worker) {
        this.worker.postMessage({
          msg: 'getPositionInfo',
          chatId: this.chat.id,
          positionInfo,
          symbol: this.settings.pair,
          settings: this.settings,
          defaultCurrency: this.defaultCurrency
        })
      }
      return positionInfo;
    }
    catch (err) {
      console.error(err);
    }
  }
  
  /**
   * Ottiene la lista degli ordini di uno specifico simbolo 
   * se non è specificato ottiene la lista di tutti gli ordini di tutti i simboli
   * @param {*} limitOrders 
   * @returns 
   */
  async binanceOrderList(orderId = -1, limitOrders = 100) {
    try {

      const orders = await this.client.futuresAllOrders(this.settings.pair, {
        limit: limitOrders
      });
      return orders;

    }
    catch (err) {
      console.error(err);
    }
    return null;
  }


  async listOpenOrders() {
    try {
      const symbol = this.settings.pair;
      const orders = await this.client.futuresOpenOrders(symbol);

      const resultOrder = [];

      if (orders && orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          const itm = orders[i];
          const dbOrder = await ordersBookRepo.findOne(this.settings.chatId, itm.orderId);
          let label = null;
          if (dbOrder && dbOrder.orderId) {
            label = dbOrder.label;
          }

          resultOrder.push({
            orderId: itm.orderId,
            status: itm.status,
            quantity: itm.origQty,
            type: itm.type,
            label: label,
            side: itm.side,
            symbol: itm.symbol,
            level: itm.price
          });
        }
      }

      if (this.worker) {
        this.worker.postMessage({
          msg: 'listOpenOrders',
          chatId: this.chat.id,
          symbol: this.settings.pair,
          settings: this.settings,
          resultOrder,
          defaultCurrency: this.defaultCurrency
        });
      }
      return resultOrder;

    }
    catch (err) {
      console.error(err);
    }
    return [];
  }
  /**
   * Ottiene tutti gli ordini pendenti
   */
  async openOrders(side = '') {
    try {
      const symbol = this.settings.pair;
      const orders = await this.client.futuresAllOrders(symbol);

      if (orders && orders.length > 0) {
        if (!!side && (side === 'BUY' || side == 'SELL')) {
          return orders.filter((itm) => itm.status === 'NEW' && itm.side === side);
        }

        return orders.filter((itm) => itm.status === 'NEW');
      }
      return orders;

    }
    catch (err) {
      console.error(err);
    }
    return null;
  }

  async cancelAllDbOrders() {
    let isDelete = true;
    try {
      await ordersBookRepo.model.deleteMany({ chatId: this.chat.id });
      isDelete = true;
    }
    catch (err) {
      console.error(err);
      isDelete = false;
    }
    return isDelete;
  }

  /**
   * Cancella tutti gli ordini pendenti
   * @returns 
   */
  async cancelAllOrders() {
    let isDelete = true;
    try {

      const cancel = await this.client.futuresCancelAll(this.settings.pair);
      isDelete = !!cancel && cancel.length > 0;
    }
    catch (err) {
      console.error(err);
      isDelete = false;
    }
    return isDelete;
  }

  /**
   * elimina tutti gli ordini pendenti specificati dal SIDE
   * 
   * @param {string} side può assumente BUY SELL 
   * @returns 
   */
  async cancelOpenedMultiOrders(side) {
    let isDelete = true;
    try {

      const orders = await this.openOrders(side);

      if (orders && orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          try {
            const orderId = orders[i].orderId;

            const orderDelete = await this.cancelOrder(orderId);

            if (orderDelete && !orderDelete.msg && orderDelete.status === 'CANCELED') {
              isDelete = true;
            }
            else {
              //console.error('order ' + orderId + "is not canceled");
              isDelete = false;
            }
          }
          catch (err) {
            //console.error(err);
            isDelete = false;
          }
        }
      }
      else {
        isDelete = false;
      }
    }
    catch (err) {
      console.error(err);
      isDelete = false;
    }
    return isDelete;
  }
  /**
   * Cancella un ordine
   * @param {string} orderId 
   * @returns 
   */
  async cancelOrder(orderId) {
    try {

      const cancel = await this.client.futuresCancel(this.settings.pair, { orderId });
      if (!!cancel && !cancel.msg && cancel.orderId) {
        return true;
      }
    }
    catch (err) {
      console.error(err);
    }
    return false;
  }

  /**
   * Ottieni tutti gli ordini emessi nella strategia
   */
  async allOrders() {
    try {
      const dbOrders = await ordersBookRepo.findAll(this.chat.id, this.settings.pair);

      return dbOrders;
    }
    catch (err) {
      console.error(err);
    }
    return [];
  }

  /**
   * Ottiene lo status di un ordine
   * 
   * @param {string} orderId 
   * @returns 
   */
  async orderStatus(orderId) {
    try {
      const statusOrder = await this.client.futuresOrderStatus(this.settings.pair, { orderId });
      return statusOrder;
    }
    catch (err) {
      console.error(err);
    }
    return null;
  }

  /**
   * Inserisce una sell limit
   * 
   * @param {number} quantity size
   * @param {number} level  entry price
   * @returns 
   */
  async insertOrderSellLimit(quantity, level, label) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      quantity = Number(quantity).toFixed(this.symbolSettings.qtyPrecision);
      level = Number(level).toFixed(this.symbolSettings.pricePrecision);

      const newOrder = await this.client.futuresSell(this.settings.pair, quantity, level, {
        timeInForce: 'GTC'
      });

      if (newOrder && newOrder.orderId && newOrder.orderId > 0) {

        try {
          await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
            orderId: newOrder.orderId,
            status: newOrder.status,
            type: newOrder.type,
            label,
            side: newOrder.side,
            symbol: newOrder.symbol,
            level: newOrder.price
          });
        } catch (err) {
          console.error(err);
        }

        return newOrder;
      }

    } catch (err) {
      console.error(err);
    }

    return null;
  }

  async insertOrderBuyLimit(quantity, level, label) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      quantity = Number(quantity).toFixed(this.symbolSettings.qtyPrecision);
      level = Number(level).toFixed(this.symbolSettings.pricePrecision);

      const newOrder = await this.client.futuresBuy(this.settings.pair, quantity, level, {
        timeInForce: 'GTC'
      });

      if (newOrder && newOrder.orderId && newOrder.orderId > 0) {
        await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
          orderId: newOrder.orderId,
          status: newOrder.status,
          type: newOrder.type,
          label,
          side: newOrder.side,
          symbol: newOrder.symbol,
          level: newOrder.price
        });
      }

      if (!newOrder || !newOrder.orderId) {
        return null;
      }

      return newOrder;
    } catch (err) {
      console.error(err);
    }

    return null;
  }

  /**
   * Inserisce una sell market
   * 
   * @param {number} quantity size
   * @returns 
   */
  async insertOrderSellMarket(quantity, label) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      quantity = Number(quantity).toFixed(this.symbolSettings.qtyPrecision);

      const newOrder = await this.client.futuresMarketSell(this.settings.pair, quantity);

      if (newOrder && newOrder.orderId && newOrder.orderId > 0) {
        await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
          orderId: newOrder.orderId,
          status: newOrder.status,
          type: newOrder.type,
          label,
          side: newOrder.side,
          symbol: newOrder.symbol
        });
      }
      if (!newOrder || !newOrder.orderId) {
        // errore
        return null;
      }
      return newOrder;

    } catch (err) {
      console.error(err);
    }

    return null;
  }

  async insertOrderBuyMarket(quantity, label) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      quantity = Number(quantity).toFixed(this.symbolSettings.qtyPrecision);

      const newOrder = await this.client.futuresMarketBuy(this.settings.pair, quantity);

      if (newOrder && newOrder.orderId && newOrder.orderId > 0) {
        await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
          orderId: newOrder.orderId,
          status: newOrder.status,
          type: newOrder.type,
          label,
          side: newOrder.side,
          symbol: newOrder.symbol
        });
      }
      if (!newOrder || !newOrder.orderId) {
        // errore
        return null;
      }
      return newOrder;

    } catch (err) {
      console.error(err);
    }

    return null;
  }

  /**
   * Inserisce tre ordini di Buy Limit
   * 
   * @param {Number} buyPrice1 
   * @param {Number} buyPrice2 
   * @param {Number} buyPrice3 
   * @returns 
   */
  async insertMulpleOrderBuy(buyPrice1, buyPrice2, buyPrice3) {

    try {
      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      const amount1 = Number(this.settings.longOrderAmount1 / buyPrice1).toFixed(this.symbolSettings.qtyPrecision);
      const amount2 = Number(this.settings.longOrderAmount2 / buyPrice2).toFixed(this.symbolSettings.qtyPrecision);
      const amount3 = Number(this.settings.longOrderAmount3 / buyPrice3).toFixed(this.symbolSettings.qtyPrecision);

      if (amount1 < this.symbolSettings.minLotSize || amount2 < this.symbolSettings.minLotSize || amount3 < this.symbolSettings.minLotSize) {

        return null;
      }

      const orders = [
        {
          side: 'BUY',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount1,
          price: buyPrice1.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '1'
        },
        {
          side: 'BUY',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount2,
          price: buyPrice2.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '2'
        },
        {
          side: 'BUY',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount3,
          price: buyPrice3.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '3'
        }
      ];
      const newMulpleOrder = await this.client.futuresMultipleOrders(orders) || [];
      console.debug("insertMulpleOrderBuy: ", newMulpleOrder);
      if (newMulpleOrder && newMulpleOrder.length > 0) {
        console.info("insertMulpleOrderBuy: ", newMulpleOrder.length);
        for (let i = 0; i < newMulpleOrder.length; i++) {
          const newOrder = newMulpleOrder[i];
          if (newOrder && !newOrder.msg && newOrder.orderId && newOrder.orderId > 0) {
            let iPrice = orders.findIndex((itm) => Number(itm.price) === Number(newOrder.price));
            if (iPrice !== -1)
              iPrice++;

            await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
              orderId: newOrder.orderId,
              status: newOrder.status,
              quantity: newOrder.origQty,
              type: newOrder.type,
              label: iPrice.toString(),
              side: newOrder.side,
              symbol: newOrder.symbol,
              level: newOrder.price
            });
          }
          else if (newOrder.msg) {
            console.debug(newOrder.msg);
          }
        }
      }

      return newMulpleOrder;

    } catch (err) {
      console.error(err);
    }

    return null;
  }

  /**
   * Inserisce tre ordini si sell Limit
   * 
   * @param {Number} sellPrice1 
   * @param {Number} sellPrice2 
   * @param {Number} sellPrice3 
   * @returns 
   */
  async insertMulpleOrderSell(sellPrice1, sellPrice2, sellPrice3) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      const amount1 = Number(this.settings.shortOrderAmount1 / sellPrice1).toFixed(this.symbolSettings.qtyPrecision)
      const amount2 = Number(this.settings.shortOrderAmount2 / sellPrice2).toFixed(this.symbolSettings.qtyPrecision)
      const amount3 = Number(this.settings.shortOrderAmount3 / sellPrice3).toFixed(this.symbolSettings.qtyPrecision)

      if (amount1 < this.symbolSettings.minLotSize || amount2 < this.symbolSettings.minLotSize || amount3 < this.symbolSettings.minLotSize) {
        return null;
      }

      const orders = [
        {
          side: 'SELL',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount1,
          price: sellPrice1.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '1'
        },
        {
          side: 'SELL',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount2,
          price: sellPrice2.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '2'
        },
        {
          side: 'SELL',
          type: 'LIMIT',
          symbol: this.settings.pair,
          quantity: amount3,
          price: sellPrice3.toFixed(this.symbolSettings.pricePrecision),
          timeInForce: 'GTC',
          label: '3'
        },
      ];

      const newMulpleOrder = await this.client.futuresMultipleOrders(orders) || [];
      console.debug("insertMulpleOrderSell: ", newMulpleOrder);
      if (newMulpleOrder && newMulpleOrder.length > 0) {
        console.info("insertMulpleOrderSell: ", newMulpleOrder.length);
        for (let i = 0; i < newMulpleOrder.length; i++) {
          const newOrder = newMulpleOrder[i];
          if (newOrder && newOrder.orderId && newOrder.orderId > 0) {
            let iPrice = orders.findIndex((itm) => Number(itm.price) === Number(newOrder.price));
            if (iPrice !== -1)
              iPrice++;

            await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
              orderId: newOrder.orderId,
              status: newOrder.status,
              quantity: newOrder.origQty,
              type: newOrder.type,
              label: iPrice.toString(),
              side: newOrder.side,
              symbol: newOrder.symbol,
              level: newOrder.price
            });
          }
          else if (newOrder.msg) {
            console.debug(newOrder.msg);
          }
        }

      }

      return newMulpleOrder;

    } catch (err) {
      console.error(err);
    }

    return null;
  }

  /**
   * Invia un ordine di stoploss
   * 
   * @param {*} positionInfo 
   * @param {*} stopLoss 
   * @returns 
   */
  async insertSLOrder(positionInfo, stopLoss, amountLotsSL) {

    try {
      if (!this.symbolSettings.minLotSize) {
        console.error('insertSLOrder-> this.symbolSettings.minLotSize');
        return { SLOrder:null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      if (!amountLotsSL || amountLotsSL == '0') {
        console.error('insertSLOrder-> !amountLotsSL || amountLotsSL == 0');
        return { SLOrder:null, errors: "ERROR_AMOUNT_SL" };
      }

      const amount = Math.abs(amountLotsSL).toFixed(this.symbolSettings.qtyPrecision).toString();

      if (amount < this.symbolSettings.minLotSize) {
        console.error('insertSLOrder-> amount<this.symbolSettings.minLotSize');
        return { SLOrder:null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      let orderSide = positionInfo.positionSide == 'BUY' ? 'SELL' :
        positionInfo.positionSide == 'SELL' ? 'BUY' : null;

      if (!orderSide) {
        /////////// BUY /////////////////////
        const positionInfo = await this.getPositionInfo();
        const positionAmount = positionInfo.positionAmt;
        orderSide = positionAmount > 0 ? 'SELL' : positionAmount < 0 ? 'BUY' : null;

        if (!orderSide) {
          console.error("insertSLOrder positionInfo.positionSide non definita correttamente, infatti positionInfo.positionSide: ", positionInfo.positionSide);
          return { SLOrder:null, errors: "ERROR_ORDER_SIDE" };
        }
      }


      let orders = {
        side: orderSide,
        type: 'STOP_MARKET',
        symbol: this.settings.pair,
        quantity: amount,
        stopPrice: Number(stopLoss).toFixed(this.symbolSettings.pricePrecision).toString(),
        timeInForce: 'GTC',
        reduceOnly: true
      };

      const newOrder = await this.client.futuresOrder(orders.side, orders.symbol, orders.quantity, false, {
        type: orders.type,
        stopPrice: orders.stopPrice,
        timeInForce: orders.timeInForce,
        reduceOnly: orders.reduceOnly
      });

      if (newOrder && newOrder.orderId) {
        try {
          await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
            orderId: newOrder.orderId,
            status: newOrder.status,
            quantity: newOrder.origQty,
            type: newOrder.type,
            label: 'SL',
            side: newOrder.side,
            symbol: newOrder.symbol,
            level: newOrder.price,
            stopPrice: !!newOrder.stopPrice ? newOrder.stopPrice : 0
          });
        } catch (err) {
          console.error(err);
        }

        return { SLOrder:newOrder, errors: null };
      }

    } catch (err) {
      console.error(err);
    }

    return { SLOrder:null, errors: "GENERIC_ERROR" };
  }

  /**
  * Invia un ordine di take profit
  * 
  * @param {*} positionInfo 
  * @param {*} stopLoss 
  * @returns 
  */
  async insertTPOrder(positionInfo, takeProfit, amountLotsTP) {
    try {
      if (!this.symbolSettings.minLotSize) {
        console.error('insertTPOrder-> this.symbolSettings.minLotSize');
        return { TPOrder:null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      if (!amountLotsTP || amountLotsTP == '0') {
        console.error('insertTPOrder-> !amountLotsTP || amountLotsTP == 0');
        return { TPOrder:null, errors: "ERROR_AMOUNT_TP" };
      }

      const amount = Math.abs(amountLotsTP).toFixed(this.symbolSettings.qtyPrecision).toString();

      if (amount < this.symbolSettings.minLotSize) {
        console.error('insertTPOrder-> amount<this.symbolSettings.minLotSize');
        return { TPOrder:null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      let orderSide = positionInfo.positionSide == 'BUY' ? 'SELL' :
        positionInfo.positionSide == 'SELL' ? 'BUY' : null;

      if (!orderSide) {
        /////////// BUY /////////////////////
        const positionInfo = await this.getPositionInfo();
        const positionAmount = positionInfo.positionAmt;
        orderSide = positionAmount > 0 ? 'SELL' : positionAmount < 0 ? 'BUY' : null;

        if (!orderSide) {
          console.error("insertTPOrder positionInfo.positionSide non definita correttamente, infatti positionInfo.positionSide: ", positionInfo.positionSide);
          return { TPOrder:null, errors: "ERROR_ORDER_SIDE" };
        }
      }

      let orders = {
        side: orderSide,
        type: 'LIMIT',
        symbol: this.settings.pair,
        quantity: amount,
        price: Number(takeProfit).toFixed(this.symbolSettings.pricePrecision).toString(),
        timeInForce: 'GTC',
        reduceOnly: true
      };

      const newOrder = await this.client.futuresOrder(orders.side, orders.symbol, orders.quantity, orders.price, {
        type: orders.type,
        timeInForce: orders.timeInForce,
        reduceOnly: orders.reduceOnly
      });

      if (newOrder && newOrder.orderId) {
        try {
          await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
            orderId: newOrder.orderId,
            status: newOrder.status,
            quantity: newOrder.origQty,
            type: newOrder.type,
            label: 'TP',
            side: newOrder.side,
            symbol: newOrder.symbol,
            level: newOrder.price
          });
        } catch (err) {
          console.error(err);
        }

        return { TPOrder:newOrder, errors: null };
      }

    } catch (err) {
      console.error(err);
    }

    return { TPOrder:null, errors: "GENERIC_ERROR" };
  }

    /**
  * Invia un ordine limit per la Mid Bolinger Band
  * 
  * @param {*} positionInfo 
  * @param {*} stopLoss 
  * @returns 
  */
    async insertMBOrder(positionInfo, midBollingerBand, amountLotsMB) {
    try {
      if (!this.symbolSettings.minLotSize) {
        console.error('insertMBOrder-> this.symbolSettings.minLotSize');
        return { newMBOrder: null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      if (!amountLotsMB || amountLotsMB == '0') {
        console.error('insertMBOrder-> !amountLotsMB || amountLotsMB == 0');
        return { newMBOrder: null, errors: "ERROR_AMOUNT_MB" };
      }

      const amount = Math.abs(amountLotsMB).toFixed(this.symbolSettings.qtyPrecision).toString();

      if (amount < this.symbolSettings.minLotSize) {
        console.error('insertMBOrder-> amount<this.symbolSettings.minLotSize');
        return { newMBOrder: null, errors: "ERROR_MIN_LOT_SIZE" };
      }

      let orderSide = positionInfo.positionSide == 'BUY' ? 'SELL' :
        positionInfo.positionSide == 'SELL' ? 'BUY' : null;

      if (!orderSide) {
        /////////// BUY /////////////////////
        const positionInfo = await this.getPositionInfo();
        const positionAmount = positionInfo.positionAmt;
        orderSide = positionAmount > 0 ? 'SELL' : positionAmount < 0 ? 'BUY' : null;

        if (!orderSide) {
          console.error("insertMBOrder positionInfo.positionSide non definita correttamente, infatti positionInfo.positionSide: ", positionInfo.positionSide);
          return { newMBOrder: null, errors: "ERROR_ORDER_SIDE" };
        }
      }

      let orders = {
        side: orderSide,
        type: 'LIMIT',
        symbol: this.settings.pair,
        quantity: amount,
        price: Number(midBollingerBand).toFixed(this.symbolSettings.pricePrecision).toString(),
        timeInForce: 'GTC',
        reduceOnly: true
      };

      const newOrder = await this.client.futuresOrder(orders.side, orders.symbol, orders.quantity, orders.price, {
        type: orders.type,
        timeInForce: orders.timeInForce,
        reduceOnly: orders.reduceOnly
      });

      if (newOrder && newOrder.orderId) {
        try {
          await ordersBookRepo.updateOne(this.chat.id, newOrder.orderId, {
            orderId: newOrder.orderId,
            status: newOrder.status,
            quantity: newOrder.origQty,
            type: newOrder.type,
            label: 'MB',
            side: newOrder.side,
            symbol: newOrder.symbol,
            level: newOrder.price
          });
        } catch (err) {
          console.error(err);
        }

        return { newMBOrder: newOrder, errors: null };
      }

    } catch (err) {
      console.error(err);
    }

    return { newMBOrder: null, errors: "GENERIC_ERROR" };
  }

  async insertOrderProtection(positionInfo, stopLoss, takeProfit, amountLotsSL, amountLotsTP) {
    let errors = null;
    let newMulpleOrder = [];
    try {
      const sl = await this.insertSLOrder(positionInfo, stopLoss, amountLotsSL);
      if (!sl) {
        errors = 'MISSING_SL';
      } else {
        newMulpleOrder.push(sl);
        const tp = await this.insertTPOrder(positionInfo, takeProfit, amountLotsTP);
        if (!tp) {
          errors = 'MISSING_TP';
        }
        else {
          newMulpleOrder.push(tp);
        }
      }
    } catch (err) {
      console.error(err);
      errors = 'GENERIC_ERROR';
    }

    return { newMulpleOrder, errors };
  }

  /**
   * Chiude una percentuale della postion esistente
   * 
   * @param {object} positionInfo 
   * @param {decimal} closePercent 
   * @returns 
   */
  async insertOrderPartialClose(positionInfo, closePercent) {

    try {

      if (!this.symbolSettings.minLotSize) {
        return null;
      }

      if (!positionInfo || positionInfo.positionSide === 'BOTH' || positionInfo.positionAmount == '0') {
        console.debug('Binance-client: error in positioside 891 ', positionInfo.positionSide);
        return;
      }

      const amount = Math.abs(((positionInfo.positionAmount * closePercent) / 100)).toFixed(this.symbolSettings.qtyPrecision);

      console.debug(`insertOrderPartialClose amount, min lot: ${this.symbolSettings.minLotSize}, position side: ${positionInfo.positionSide}`);

      if (amount >= this.symbolSettings.minLotSize) {

        const newOrder = positionInfo.positionSide;

        if (newOrder == 'BUY') {
          await this.client.futuresMarketSell(this.settings.pair, amount);
        }
        else if (newOrder == 'SELL') {
          await this.client.futuresMarketBuy(this.settings.pair, amount);
        }


        console.debug("insertOrderPartialClose new order ", newOrder);

        return newOrder;

      }
    } catch (err) {
      console.error(err);
    }

    return null;
  }
  /**
   * Ottiene la data del server di binance in formato UTC
   * Indicators
   * @returns timestamp
   */
  binanceTime = async () => {
    if (this.client) {
      return await this.client.time();
    }
  };

  /**
   * 
   * @returns 
   */
  async accountInfo() {
    try {
      if (this.client) {
        await this.getDefaultCurrencyFromAccount();
        return await this.client.futuresAccount();
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Calcolo indicatore di bollinger valori da utilizzare :
   * periodo = 20 e deviazione standard: 2.0
   * output: UP , LOW , MID BAND
   * 
   * @param {number} period 
   * @param {number} devStandard 
   * @param {array} values 
   */
  async calcBollinger(period, stdDev, values) {
    const bb = Indicators.BollingerBands.calculate({
      period,
      values,
      stdDev
    });
    //console.debug("bollinger bands: ", bb);
    return bb;
  }

  /**
   * Calcolare l'indicatore ADX  input periodo o=14 
   * output  parametri da utilizzare mdi e pdi
   * 
   * @param {*} period 
   * @param {*} values 
   */
  async calcADX(period, values) {
    const inp = {
      period,
      close: values.close,
      high: values.high,
      low: values.low
    }

    const adx = Indicators.ADX.calculate(inp);

    return adx;
  }


  balance_update_callback(data, worker) {

    
  }

  /**
   * Update degli ordini provenienti dagli user_data
   * @param {orders} data 
   */
  order_update_callback = async (data) => {

    
  }

  margin_update_callback(data) {
    
  }
  /**
   * fa partire la strategia agganciando i dati del grafico sul simbolo scelto
   * 
   * @param {string} symbol 
   */
  async attachGraph(symbol) {

    if (this.strategyUp) {
      console.error('an strategy already is up');
      return;
    }

    this.attacedError = false;
    try {
      if (this.settings) {
        this.settings.pair = symbol;
        // await this.client.useServerTime();

        // init worker
        this.worker = runBinanceWorker(this.settings.chatId, symbol);

        // inizializza il grafico aggancuiando indicatori e strategia
        this.worker.on('message', (msg) => {

          console.debug('runBinanceWorker: ', msg);
          if (msg && msg.msg) {
            if (msg.msg == 'update') {
              // aggiornamenti dalla stategia
              switch (msg.type) {

                case 'insertOrderPartialClose':
                  const positionInfo = msg.positionInfo;
                  const closePercent = msg.closePercent;

                  this.insertOrderPartialClose(positionInfo, closePercent);
                  break;

                case 'insertOrderProtection':

                  const positionInfoProtect = msg.positionInfo;
                  const stopLoss = msg.stopLoss;
                  const takeProfit = msg.takeProfit;

                  this.insertOrderProtection(positionInfoProtect, stopLoss, takeProfit);

                  break;

                case 'insertMulpleOrderBuy':
                  this.insertMulpleOrderBuy(msg.buyPrice1, msg.buyPrice2, msg.buyPrice3);
                  break;

                case 'insertMulpleOrderSell':
                  this.insertMulpleOrderSell(msg.sellPrice1, msg.sellPrice2, msg.sellPrice3);
                  break;

                case 'cancelAllOrders':
                  this.cancelAllOrders();
                  break;

                case 'cancelOpenedMultiOrders':
                  this.cancelOpenedMultiOrders(msg.side);
                  break;

                case 'setMinLotSize':
                  const minLot = msg.value;
                  this.symbolSettings.minLotSize = minLot;
                  break;

                case "getPositionInfo":
                  this.getPositionInfo();
                  break;

                  break;
                case 'sendMessage':

                  //const mChatId = msg.chatId;
                  const mMessage = msg.message;
                  // manada l'evento strategy message
                  this.events.emit('STRATEGY_MESSAGES', mMessage);
                  break;

                case 'ready':
                  /// il thred della strategia e' ready e stra ricendo i dati lo status ì UP
                  this.events.emit('STRATEGY_READY', this.chat.id, this.settings.symbol);
                  break;

                case 'closed':

                  /// manada l'evento strategy started
                  this.events.emit('STRATEGY_CLOSED', this.chat.id);
                  break;

                case 'listOpenOrders':
                  this.listOpenOrders();
                  break;

                case 'cancelOrder':
                  this.cancelOrder(msg.orderId);
                  break;

                case 'insertOrderSellLimit':
                  this.insertOrderSellLimit(msg.quantity, msg.level, msg.label);
                  break;

                case 'insertOrderBuyLimit':
                  this.insertOrderBuyLimit(msg.quantity, msg.level, msg.label);
                  break;

                case 'insertOrderSellMarket':
                  this.insertOrderSellMarket(msg.quantity, msg.label);
                  break;

                case 'insertOrderBuyMarket':
                  this.insertOrderBuyMarket(msg.quantity, msg.label);
                  break;

                case "complete_stop":
                  this.events.emit('STRATEGY_COMPLETE_STOP', this.chat.id);
                  break;
              }
            }
          }

        });

        this.worker.on('error', (msg) => {
          console.error("runBinanceWorker error ", msg);
          this.strategyUp = false;
        });

        this.worker.on('exit', (msg) => {
          console.debug('runBinanceWorker exit ' + msg);
          this.strategyUp = false;
        });

        // aggancia le info dell'account
        this.client.websockets.userFutureData(this.margin_update_callback.bind(this), this.balance_update_callback.bind(this), this.order_update_callback.bind(this));
        // aggancia le candele 
        this.client.futuresChart(symbol, this.settings.timeFrame, this.chartcallback.bind(this));


        return true;
      }

      console.error("settings is not defined");
      return false;

    } catch (err) {
      console.error(err);
      this.attacedError = true;
      this.strategyUp = false;
    }
    return false;
  }

  async runStrategy() {

    const symbol = this.settings.pair;

    if (this.strategyUp) {
      console.error('an strategy already is up');
      return;
    }

    this.attacedError = false;
    try {
      if (this.settings) {
        // await this.client.useServerTime();

        // init worker
        this.worker = runBinanceWorker(this.settings.chatId, symbol);

        // inizializza il grafico aggancuiando indicatori e strategia
        this.worker.on('message', async (msg) => {

          console.debug('runBinanceWorker: ', msg);
          if (msg && msg.msg) {
            if (msg.msg == 'update') {
              // aggiornamenti dalla stategia
              switch (msg.type) {

                case 'insertOrderPartialClose':
                  const positionInfo = msg.positionInfo;
                  const closePercent = msg.closePercent;

                  this.insertOrderPartialClose(positionInfo, closePercent);
                  break;

                case 'insertOrderProtection':

                  const positionInfoProtect = msg.positionInfo;
                  const stopLoss = msg.stopLoss;
                  const takeProfit = msg.takeProfit;

                  this.insertOrderProtection(positionInfoProtect, stopLoss, takeProfit);

                  break;

                case 'insertMulpleOrderBuy':
                  this.insertMulpleOrderBuy(msg.buyPrice1, msg.buyPrice2, msg.buyPrice3);
                  break;

                case 'insertMulpleOrderSell':
                  this.insertMulpleOrderSell(msg.sellPrice1, msg.sellPrice2, msg.sellPrice3);
                  break;

                case 'cancelAllOrders':
                  this.cancelAllOrders();
                  break;

                case 'cancelOpenedMultiOrders':
                  this.cancelOpenedMultiOrders(msg.side);
                  break;

                case 'setMinLotSize':
                  const minLot = msg.value;
                  this.symbolSettings.minLotSize = minLot;
                  break;

                case "getPositionInfo":
                  this.getPositionInfo();
                  break;

                  break;
                case 'sendMessage':

                  //const mChatId = msg.chatId;
                  const mMessage = msg.message;
                  // manada l'evento strategy message
                  this.events.emit('STRATEGY_MESSAGES', mMessage);
                  break;

                case 'ready':
                  /// il thred della strategia e' ready e stra ricendo i dati lo status ì UP
                  this.events.emit('STRATEGY_READY', this.chat.id, this.settings.symbol);
                  break;

                case 'closed':

                  /// manada l'evento strategy started
                  this.events.emit('STRATEGY_CLOSED', this.chat.id);
                  break;

                case 'terminated':
                  // termina il thread
                  await this.stop();
                  break;
                case 'listOpenOrders':
                  this.listOpenOrders();
                  break;

                case 'cancelOrder':
                  this.cancelOrder(msg.orderId);
                  break;

                case 'insertOrderSellLimit':
                  this.insertOrderSellLimit(msg.quantity, msg.level, msg.label);
                  break;

                case 'insertOrderBuyLimit':
                  this.insertOrderBuyLimit(msg.quantity, msg.level, msg.label);
                  break;

                case 'insertOrderSellMarket':
                  this.insertOrderSellMarket(msg.quantity, msg.label);
                  break;

                case 'insertOrderBuyMarket':
                  this.insertOrderBuyMarket(msg.quantity, msg.label);
                  break;

                case "complete_stop":
                  this.events.emit('STRATEGY_COMPLETE_STOP', this.chat.id);
                  break;
              }
            }
          }

        });

        this.worker.on('error', (msg) => {
          console.error("runBinanceWorker error ", msg);
          this.strategyUp = false;
        });

        this.worker.on('exit', (msg) => {
          console.debug('runBinanceWorker exit ' + msg);
          this.strategyUp = false;
        });

        return true;
      }

      console.error("settings is not defined");
      return false;

    } catch (err) {
      console.error(err);
      this.attacedError = true;
      this.strategyUp = false;
    }
    return false;
  }

  async chartcallback(symbol, interval, chart) {

    if (symbol !== this.settings.pair) {
      return;
    }

    let chat2 = Object.keys(chart).length - 1;
    let tick = Object.keys(chart)[chat2];
    // let date = Number(tick);
    const last = chart[tick];
    /*
    console.info("-------- INTERVAL ", interval, " SYMBOL ", symbol, " time: ", formatDatTime(date));
    console.info("last open: ", last.open, " USDT");
    console.info("last high: ", last.high, " USDT");
    console.info("last low: ", last.low, " USDT");
    console.info("last close: ", last.close, " USDT");
    console.info("last volume: ", last.volume, " USDT");
    console.info("last isFinal: ", last.isFinal);
    console.info("last closeTime: ", last.closeTime);
    console.info("last tick: ", tick);
    console.info("-------------------------------------");
    */

    // ottieni goli arrau o h l c necessario al calcolo delle bande di bollinger
    // l'oggetto di è un array di  valori {open[],high[],low[],close[]}
    const ohlcs = this.client.ohlc(chart);

    const bollingerBandIndicator = await this.calcBollinger(this.strategyPeriods.bollinger,
      this.strategyPeriods.stdDev, ohlcs.close);

    const dmxIndicator = await this.calcADX(this.strategyPeriods.adx, ohlcs);

    const kLineObject = {
      msg: 'kline',
      chatId: this.chat.id,
      symbol,
      bollingerBandIndicator,
      dmxIndicator,
      prevCloseTime: last.closeTime,
      kclosePrice: last.close,
      kTick: last,
      minNotional: this.symbolSettings.minNotional,
      qtyPrecision: this.symbolSettings.qtyPrecision,
      settings: this.settings,
      defaultCurrency: this.defaultCurrency
    }
    if (last && this.worker) {
      this.worker.postMessage(kLineObject);
    }

    return kLineObject;
  }
  /**
   * Chiude la connessione al db
   */
  async stop() {
    await this.terminateSockets();

    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
    catch (err) {
      console.error(err);
    }
  }


  async terminateSockets() {
    try {
      let endpoints = this.client.futuresSubscriptions();
      for (let endpoint in endpoints) {
        console.debug("..terminating websocket: " + endpoint);
        await this.client.websockets.terminate(endpoint);
      }
      this.strategyUp = false;
      return true;
    }
    catch (err) {
      console.error(err);
    }
    return false;
  }

  async loadSymbolSettings(pair) {

    this.symbolSettings.name = '';
    try {
      const exInfo = await this.client.futuresExchangeInfo();

      for (let obj of exInfo.symbols) {
        if (obj.symbol === pair) {

          const priceFilter = obj.filters.find((t) => t.filterType === 'PRICE_FILTER');
          const lotSizeFilter = obj.filters.find((t) => t.filterType === 'LOT_SIZE');

          if (lotSizeFilter) {
            let lotSize = lotSizeFilter.stepSize.substring(lotSizeFilter.stepSize.indexOf('.') + 1);
            lotSize = lotSize.substring(0, lotSize.indexOf('1') + 1).length;

            this.symbolSettings.qtyPrecision = lotSize;
          }

          if (priceFilter) {
            let tickSize = priceFilter.tickSize.substring(priceFilter.tickSize.indexOf('.') + 1);
            tickSize = tickSize.substring(0, tickSize.indexOf('1') + 1).length;

            this.symbolSettings.pricePrecision = tickSize;
          }
          this.symbolSettings.name = pair;
          this.symbolSettings.minNotional = obj.filters.filter((t) => t.filterType == 'MIN_NOTIONAL')[0].notional;

          return this.symbolSettings;
        }
      }
    }
    catch (err) {
      console.error(err);
    }

    return this.symbolSettings;
  }


  /**
   * Carica i settings della strategia associata al chat id
   * @param {string} pair 
   * @returns 
   */
  async loadSettings(pair) {
    try {
      if (pair) {
        const result = await settingsRepo.loadSettingsForPair(this.chat.id, pair);
        if (!!result) {
          this.settings = result;

          return result;
        }
        else {
          // settings non trovati
          // imposta i settings di default
          const strategyPeriods = this.strategyPeriods;

          this.settings = {
            ...defaultsSettings,
            strategyPeriods,
            chatId: this.chat.id,
            pair,
            balanceCurrency: 'USDT'
          }
          await settingsRepo.save(this.chat.id, pair, this.settings);
        }

        return this.settings;
      }
    }
    catch (err) {
      console.error(err);
    }

    return this.settings;
  }

  postCommand(cmd) {
    if (cmd && cmd.chatId && this.worker) {
      this.worker.postMessage({
        ...cmd,
        symbol: this.settings.pair,
        settings: this.settings,
        defaultCurrency: this.defaultCurrency
      });
    }
  }
}