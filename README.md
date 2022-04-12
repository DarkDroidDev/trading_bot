# Trading Bot V2

binance bot tradinding

# Procedura attivazione bot

- cercare su telegram botfather
- selezionare il primo orisultato quello con la spunta blue
- fare click su avvia
- digitare nella chat /newbot
- scrivere il nome del bot
- scrivere l'username del bot

## Attivare realmente il bot ed avvisare Telegram della sua presenza. 
- Aprite qualsiasi browser e scrivete nella barra degli indirizzi la stringa seguente (se avete usato Hook.io):

https://api.telegram.org/botToken/setWebhook?url=https://hook.io/tuonomeaccount/nomehook
Se tutti i passaggi sono stati svolti in maniera ottimale, visualizzerete un messaggio di avvenuta attivazione, che spesso è il seguente (sempre se avete utilizzato Hook.io):

{“ok”:true,”result”:true,”description”:”Webhook was set”}
Il vostro bot su Telegram è stato creato correttamente!

Hai bisogno di supporto per il tuo sito WordPress? Contattaci

[formidable id=3]

# Libreria utilizzata

- https://www.npmjs.com/package/binance-api-node
- https://github.com/telegraf/telegraf

# Configurazione


# TODO
- create un'insime di comandi che vanno a modificare i settings della strategia
- creare comando cambio password
- creare comando help che mostra tutti i comandi

### funzioni da implementare per gli ordini

Queste riguardano le funzioni per gli ordini pending anche detti limit orders che non sono ancora entrati effettivamente in posizione

·         InsertLimitOrder (Type,level,stopLoss,TakeProfit,ExpireDate,MaxLeverage) dovrebbe ritornare un orderID da memorizzare

·         ModifyLimitOrder (orderID ,newLevel,newStopLoss,newTakeProfit,nweMaxLeverage)

·         cancelLimitOrder(orderID)

·         cancelAllLimitOrders()

·         cancellAllLimitOrdersByType(type);

 

Queste riguardano le funzioni per gli ordini entrati effettivamente in posizione

·         ModifyPosition(positionID,newStopLoss,newTakeProfit);

·         closeAllPositions()

·         getPositionEntryPrice(positionID);

·         getPositionLots(positionID);

·         getPositionStopLoss(positionID);

·         getPositionTakeProfit(positionID);

·         getAllPositionsNetProfit();

·         closePartialPositionLots(positioned,percentToClose);

 

P.S. questa pagina potrebbe esserci utile: https://binance-docs.github.io/apidocs/spot/en/#trade-streams

## Dati ordine
avgPrice:'0.00000'
clientOrderId:'F5Qi5W9KOA6eQJsuSVPakw'
closePosition:false
cumQty:'0'
cumQuote:'0'
executedQty:'0'
orderId:203247041
origQty:'0.10'
origType:'LIMIT'
positionSide:'BOTH'
price:'400'
priceProtect:false
reduceOnly:false
side:'SELL'
status:'NEW'
stopPrice:'0'
symbol:'BNBUSDT'
timeInForce:'GTC'

## LOGICA TASTI
status START attivo -> STOP, PAUSE, BALANCE, SETTING attivi, START disattivato

status STOP attivo -> START, BALANCE, SETTING attivi, PAUSE, STOP disattivati

status PAUSE attivo -> STOP, BALANCE, SETTING attivi, START, PAUSE disattivati

se dal setting si cambia pair  quando si effettua il salvataggio in automatico la strategia va in STOP