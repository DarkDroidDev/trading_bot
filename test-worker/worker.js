import { Worker, workerData, parentPort } from "worker_threads";

console.log(workerData);

parentPort.on('message', (messages) => {
    console.log('service ',messages);
});
parentPort.on('messageerror', (messages) => {
    console.error('service msg error',messages);
});

parentPort.on('close', (messages) => {
    console.log("close ", messages);
});

parentPort.start();