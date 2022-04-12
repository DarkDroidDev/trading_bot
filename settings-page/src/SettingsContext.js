import React from 'react';
import AlertMessageDialog from './AlertMessage';
import { editSettings, listSettings, listSymbols, restartServer } from './AppServices';


const settingsData = {
    chatId: -1,
    pair: "",
    feesMax: 0.1,
    levaMax: 1,
    longOrderAmount1: 200,
    longOrderAmount2: 200,
    longOrderAmount3: 500,
    longTradePricePercent1: 0.3,
    longTradePricePercent2: -1,
    longTradePricePercent3: -5,
    shortOrderAmount1: 200,
    shortOrderAmount2: 200,
    shortOrderAmount3: 500,
    shortTradePricePercent1: -0.3,
    shortTradePricePercent2: 1,
    shortTradePricePercent3: 5,
    smartTakeProfit: 1,
    startLevelPercent: -2,
    stopBotFor: 6,
    stopLossPercent: 5,
    takeProfitPercent: -1,
    timeFrame: "5m",
    timeOorderExpiration: 30,
    limDMIMin: 9,
    limDMIMax: 40,
    symbols: [],
    load: async () => { },
    save: async () => { },
    exit: async () => { },
    restart: async () => { }
}

export const SettingsContext = React.createContext({ ...settingsData });

export class SettingsStore extends React.Component {

    constructor(props) {
        super(props);
        settingsData.save = this.onSaveData.bind(this);
        settingsData.load = this.loadAllSettings.bind(this);
        settingsData.exit = this.onExit.bind(this);
        settingsData.restart = this.onRestart.bind(this);

        this.state = { ...settingsData }

        this.alertDialog = React.createRef();
    }

    componentDidMount() {
        this.loadAllSettings();
    }

    /**
     * Esegue il restart del server e ritorna true se la richiesta e' andata a buon fine
     * @returns 
     */
    async onRestart() {
        try {
            const result = await restartServer(this.state.chatId);
            return result && result.msg && result.msg === 'ok';
        } catch (err) {
            console.log(err);
        }
    }

    async onExit() {
        sessionStorage.removeItem("token-data");
        localStorage.removeItem("token-data");
        window.location.reload();
    }
    async loadAllSettings() {
        try {
            const settingsResult = await listSettings();
            if (settingsResult && !settingsResult.error) {
                try {
                    const data = settingsResult.data;
                    if (!!data)
                        this.setState({
                            chatId: data.chatId,
                            pair: data.pair,
                            feesMax: data.feesMax,
                            levaMax: data.levaMax,
                            longOrderAmount1: data.longOrderAmount1,
                            longOrderAmount2: data.longOrderAmount2,
                            longOrderAmount3: data.longOrderAmount3,
                            longTradePricePercent1: data.longTradePricePercent1,
                            longTradePricePercent2: data.longTradePricePercent2,
                            longTradePricePercent3: data.longTradePricePercent3,
                            shortOrderAmount1: data.shortOrderAmount1,
                            shortOrderAmount2: data.shortOrderAmount2,
                            shortOrderAmount3: data.shortOrderAmount3,
                            shortTradePricePercent1: data.shortTradePricePercent1,
                            shortTradePricePercent2: data.shortTradePricePercent2,
                            shortTradePricePercent3: data.shortTradePricePercent3,
                            smartTakeProfit: data.smartTakeProfit,
                            startLevelPercent: data.startLevelPercent,
                            stopBotFor: data.stopBotFor,
                            stopLossPercent: data.stopLossPercent,
                            takeProfitPercent: data.takeProfitPercent,
                            timeFrame: data.timeFrame,
                            timeOorderExpiration: data.timeOorderExpiration,
                            limDMIMin: data.limDMIMin,
                            limDMIMax: data.limDMIMax
                        });
                } catch (err) {
                    console.error(err);
                }
            }
        } catch (err) {
            this.alertDialog.current.openDialog('Error while loading settings');
        }

        try {
            const symbols = await listSymbols();

            if (symbols && symbols.data && symbols.data.length > 0) {
                this.setState({
                    symbols: symbols.data.map((value) => { return { label: value, value }; })
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * 
     * @param {*} settings 
     * @param {boolean} needStop 
     * @returns 
     */
    async onSaveData(settings, needStop) {
        if (settings) {
            const result = await editSettings(settings, needStop);

            if (result && result.msg && result.msg === 'ok') {
                await this.loadAllSettings();
                return true;
            }
        }

        return false;
    }


    render() {
        return (
            <>
                <AlertMessageDialog ref={this.alertDialog} />
                <SettingsContext.Provider value={this.state}>
                    {this.props.children}
                </SettingsContext.Provider>
            </>
        );
    }
}