import { Worker } from "worker_threads";

export const runWorker = () => {
    const workerFile = "./worker.js";
    // Create the worker.
    const worker = new Worker(workerFile, {
        workerData: {
            msg: "sending"
        }
    });

    // Listen for messages from the worker and print them.
    worker.on('message', (msg) => {
        console.log('runWorker: ', msg);
    });

    worker.on('error', (msg) => {
        console.error("runWorker error ", msg);
    });

    worker.on('exit', (msg) => {
        console.log('runWorker exit ' + msg);
    });
    return worker;
};
