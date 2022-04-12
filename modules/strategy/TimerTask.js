import EventEmitter from 'events';
import { Console as console } from '../logger-mod.js';

export class TimerTask {
   start = (new Date()).getTime();
   // frequenza di esecuzione degli neventi
   freq = process.env.TIMER_FREQ;
   events = new EventEmitter();
   pause = false;
   constructor(_name='timerTask') {
      this.name = _name;
   }
   reset() {
      const currentTime = (new Date()).getTime();
      this.start = currentTime;
   }
   stop() {
      this.pause = true;
      console.debug(`${this.name} stopped`);
   }
   play() {
      this.pause = false;
      console.debug(`${this.name} play`);
   }
   playFromStart() {
      this.reset();
      this.pause = false;
      console.debug(`${this.name} playFromStart`);
   }
   async run() {
      const currentTime = (new Date()).getTime();
      const elapsed = (currentTime - this.start);
      if (elapsed >= this.freq && !this.pause) {
         this.reset();
         try {
            const events = this.events.eventNames();
            for (let i = 0; i < events.length; i++)
               this.events.emit(events[i], [currentTime]);
         }
         catch (err) {
            console.error(err);
         }
      }

      if (this.pause) {
         this.reset();
      }else {
         console.debug(`${this.name} elapsed time:`, elapsed);
      }

      return elapsed;
   }

   on(eventName, _callback) {
      if (!this.events.eventNames().includes(eventName)) {
         this.reset();
         this.events.on(eventName, _callback);
      }
   }

   off(eventName, _callback) {
      this.events.off(eventName, _callback);
   }

   once(eventName, _callback) {
      this.events.once(eventName, _callback);
   }
}

export const timer = new TimerTask();
export const timerMBOrder = new TimerTask('timerMBOrder');
export const timerTPOrder = new TimerTask('timerTPOrder');

timer.stop();
timerMBOrder.stop();
timerTPOrder.stop();

export async function stopAllTimers() {
   timer.stop();
   timerMBOrder.stop();
   timerTPOrder.stop();
}
