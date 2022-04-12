import BinanceTrading from '../modules/binance-client.js';

const chat = {
    id: 1082955475,
    username: 'lucianogrippa'
}
const symbol = 'BTCUSDT';
const bInstance = new BinanceTrading(chat);
await bInstance.loadSettings(symbol);
await bInstance.loadSymbolSettings(symbol);
await bInstance.client.futuresLeverage(symbol, bInstance.settings.levaMax);

bInstance.client.websockets.trades()
bInstance.client.useServerTime(async ()=>{

    bInstance.symbolSettings.minLotSize = "0.001";
   await bInstance.insertOrderProtection({
        positionAmount: '0.005',
        positionSide: 'BOTH'
    },42000,36000,0.001,0.001);
});
// const orders  = await bInstance.client.futuresAllOrders(symbol,{
//     orderId: 2978998657
// });

// const currentOrders= orders.filter((t)=>t.status=='FILLED' || t.status=='NEW');

// console.debug(orders,currentOrders);
// await bInstance.attachGraph(symbol);

// const interval = setInterval(async ()=>{
//     let s = await bInstance.loadSettings(symbol);
//     console.debug(`settings updated`);
// },15000);
// setTimeout(() => {
//     setOrders();
// }, 20000);


//const balance = await bInstance.accountInfo();
//console.debug(balance);
// await setOrders();

// await bInstance.cancelOpenedMultiOrders('BUY');
// await bInstance.cancelOpenedMultiOrders('SELL');
// await bInstance.cancelAllOrders();

//process.exit(0);

// async function setOrders() {
//     const ordersInsertResultBuy = await bInstance.insertMulpleOrderBuy(41500, 41400, 41300);

//     const ordersInsertResultSell = await bInstance.insertMulpleOrderSell(41800, 42700, 42800);

//     /// ottieni gli ordini di apertura

//     console.debug('BUY: ', ordersInsertResultBuy);
//     console.debug('SELL: ', ordersInsertResultSell);

//     await bInstance.insertOrderProtection({
//         positionSide: 'SELL',
//         positionAmount: '0.005',
//     }, 43200, 41200);

//     // setTimeout(async () => {
//     //     await bInstance.insertOrderPartialClose({
//     //         positionSide: 'SELL',
//     //         positionAmount: '0.47',
//     //     }, 50);
//     //     await bInstance.cancelOpenedMultiOrders('BUY');
//     //     await bInstance.cancelOpenedMultiOrders('SELL');

//     //     await bInstance.insertOrderPartialClose({
//     //         positionSide: 'SELL',
//     //         positionAmount: '0.24',
//     //     }, 100);
//     // }, 10000);
// }

process.once('SIGINT', () => {
    bInstance.stop();
    clearInterval(interval);
    return 0;
})
process.once('SIGTERM', () => {
    bInstance.stop();
    clearInterval(interval);
    return 0;
});
