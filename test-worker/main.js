 import {workerData} from "worker_threads";

 import BinanceTrading from '../modules/binance-client.js';
import { ordersBookRepo } from "../repository/ordersbook-repository.js";
import { runWorker } from "./runWorker.js";


 const binanceInstance = new BinanceTrading();

 const worker = runWorker();
 
 const balance_update = (data)=> {
    console.debug("balance: ", data);

    worker.postMessage({
        msg: 'orders',
        balance: data
    });
}

const execution_update =(data)=> {

    console.debug("orders: ", data);

    if (data.order){
        worker.postMessage({
            msg: 'orders',
            orders: data.order
        });

        ordersBookRepo.updateOne(chatId, data.order.orderId, data.order).then((res) => {
            console.debug("update executed ", res);
        });

    }
        
}

const margin_update = (data)=> {
    console.debug("margin ", data);
    worker.postMessage({
        msg: 'margin',
        margins: data
    });
}

 const chartcallback = (symbol, interval, chart) =>{
        let chat2= Object.keys( chart ).length-1;
        let tick = Object.keys(chart)[chat2];
        let date = Number(tick);
        const last = chart[tick];
        console.info("-------- INTERVAL ", interval, " SYMBOL ", symbol);
        console.info("last open: ", last.open, " USDT");
        console.info("last high: ", last.high, " USDT");
        console.info("last low: ", last.low, " USDT");
        console.info("last close: ", last.close, " USDT");
        console.info("last volume: ", last.volume, " USDT");
        console.info("-------------------------------------");
        
        worker.postMessage({
            msg: 'kline',
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
        });
 }

 const symbol ="BTCUSDT";
 const timeframe= '5m';

 binanceInstance.client.websockets.userFutureData(margin_update,balance_update, execution_update);
 binanceInstance.client.websockets.chart(symbol, timeframe,chartcallback.bind(this));

 process.once('SIGINT', () => {
    binanceInstance.terminateSockets();
    worker.terminate().then(()=>{
    });
    return 0;
});

process.once('SIGTERM', () => {
    binanceInstance.terminateSockets();
    worker.terminate().then(()=>{
    });
    return 0;
});

process.once('exit', () => {
    binanceInstance.terminateSockets();
    worker.terminate().then(()=>{
    });
    return 0;
});


