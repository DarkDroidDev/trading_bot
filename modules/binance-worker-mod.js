import { Worker } from "worker_threads";
import { Console as console } from './logger-mod.js';

export const runBinanceWorker = (chatId,symbol) => {
    const workerFile = "./modules/strategy-mod.js";
    // Create the worker.
    const worker = new Worker(workerFile, {
        workerData: {
            msg: "worker",
            data: {
                symbol,chatId
            }
        }
    });
    
    // Listen for messages from the worker and print them.
    return worker;
};