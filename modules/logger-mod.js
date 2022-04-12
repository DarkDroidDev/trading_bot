import {enviorments} from "./properties-mod.js";

const {logging}=enviorments();

const ConsoleLog = (message, ...optionalParams)=> console.log(message, ...optionalParams);

const currentDate = () =>{
    const now = new Date();
    const nowDate = now.toLocaleDateString();
    const nowTime = now.toLocaleTimeString();
    const milliseconds = now.getMilliseconds();

    return `[${nowDate}] [${nowTime}] [${milliseconds}] `;
}

export const Console = {
    log: (message, ...optionalParams)=>{
        if(logging=="DEBUG" || logging=="INFO") {
           
            ConsoleLog('[INFO]',currentDate(),message, ...optionalParams);
        }
    },
    info: (message, ...optionalParams)=>{
        if(logging=="DEBUG" || logging=="INFO") {
           
            ConsoleLog('[INFO]',currentDate(),message, ...optionalParams);
        }
    },
    debug: (message, ...optionalParams)=>{
        if(logging=="DEBUG") {
           
            ConsoleLog('[DEBUG]',currentDate(),message, ...optionalParams);
        }
    },
    error: (message, ...optionalParams)=>{
        if(logging=="DEBUG" || logging=="INFO" || logging=="ERROR") {
           
            ConsoleLog('[ERROR]',currentDate(),message, ...optionalParams);
        }
    },
}