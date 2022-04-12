import { timer1Test, timer2Test, timer3Test, timerTest } from "./timer-mod.js";

export function startTimerTest() {
    setTimeout(() => {
        timerTest.stop();
        timer1Test.playFromStart();

        setTimeout(() => {
            timer1Test.stop();
            timer2Test.playFromStart();

            setTimeout(() => {
                timer2Test.stop();
                timer3Test.playFromStart();
                setTimeout(() => {
                    timer3Test.stop();
                }, 2000);
            }, 2000);

        }, 2000);
    }, 2000);
}
