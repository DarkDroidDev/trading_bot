import { TimerTask } from "../modules/strategy/TimerTask.js";
import { startTimerTest } from "./test-timer.js";

export const timerTest = new TimerTask('timer');
export const timer1Test = new TimerTask('timer1');
export const timer2Test = new TimerTask('timer2');
export  const timer3Test = new TimerTask('timer3');

timerTest.freq = 1000;
timer1Test.freq = 1000;
timer2Test.freq = 1000;
timer3Test.freq = 1000;

setInterval(()=>{
    timerTest.run();
    timer1Test.run();
    timer2Test.run();
    timer3Test.run();
},500)

timerTest.stop();
timer1Test.stop();
timer2Test.stop();
timer3Test.stop();

timerTest.playFromStart();
startTimerTest();