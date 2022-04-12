import mongoose from "mongoose";

export const settingsSchema = new mongoose.Schema({
  chatId: Number,
  pair: String,
  feesMax: Number,
  levaMax: Number,
  timeFrame: String,
  smartTakeProfit: Number,
  stopLossPercent: Number,
  takeProfitPercent: Number,
  startLevelPercent: Number,
  timeOorderExpiration: Number,
  stopBotFor: Number,
  shortTradePricePercent1: Number,
  shortTradePricePercent2: Number,
  shortTradePricePercent3: Number,
  shortOrderAmount1: Number,
  shortOrderAmount2: Number,
  shortOrderAmount3: Number,
  longTradePricePercent1: Number,
  longTradePricePercent2: Number,
  longTradePricePercent3: Number,
  longOrderAmount1: Number,
  longOrderAmount2: Number,
  longOrderAmount3: Number,
  limDMIMin: Number,
  limDMIMax: Number,
  strategyPeriods: {
    bollinger: Number,
    adx: Number,
    stdDev: Number
  }
});

