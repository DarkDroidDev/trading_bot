import mongoose from "mongoose";


export const authCodesSchema = new mongoose.Schema({
  // chat id
  chatId: Number,
  // username
  username: String,
  // codice autenticazione per la modifica dei settings
  code: String,
  // l'ultimo pair usato
  lastUsedPair: String,
  // true se rappresenta l'utente a cui e' ass0ciato l'accouhnt binance
  binanceAccount: Boolean,
  // currency di default usata per l'account
  defaultCurrency: String,
  binanceApiKey: String,
  binanceSecret: String,
  binanceTestnet: Boolean
});