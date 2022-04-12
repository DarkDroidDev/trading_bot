import React from 'react';
import AlertMessageDialog from './AlertMessage';
import { singnWithToken, timestampCall } from './AppServices';
import jwt_decode from "jwt-decode";

const accountData = {
    chatId: -1,
    username: '',
    token: '',
    connected: () => { },
    disconnected: () => { },
    onConnect: () => { },
    login: async (authCode) => { }
}

export const AccountContext = React.createContext({ ...accountData });

export class AccountStore extends React.Component {

    constructor(props) {
        super(props);

        accountData.onConnect = this.onConnect.bind(this);
        accountData.login = this.onLogin.bind(this);
        this.state = { binanceKey: '', binanceSecret: '', binanceTestNet: '', ...accountData }

        this.alertDialog = React.createRef();
        this.isAccountLoaded = false;
    }

    componentDidMount() {
        try {
            this.onConnect();
        } catch (err) {

        }
    }

    componentDidCatch() {
        console.error("error in componet");
    }
    
    async onLogin(code) {
        if (!code || code.length < 5) {
            return false;
        }

        try {
            const resultData = await singnWithToken(code);

            if (resultData && !resultData.error) {
                const data = resultData.data;
                this.setState({
                    chatId: data.chatId,
                    username: data.username,
                    token: data.token
                });
                localStorage.setItem('token-data', data.token);
                this.onConnect();
                return true;
            }
        }
        catch (err) {
            console.error(err);
        }

        return false;
    }
    /**
     * Evento collegato al pulsante conneti
     * chiamato anche quando il componente viene montato
     * @returns provider
     */
    onConnect = async () => {
        try {
            const tokenData = localStorage.getItem('token-data');
            timestampCall().then((t) => {
                if (t && t.msg && t.msg === 'ok') {
                    const serverTime = t.data;
                    try {
                        // verifica il token 
                        if (tokenData) {
                            const token = jwt_decode(tokenData);
                            const timediff = token.exp - serverTime;
                            if (!!token && timediff > 0) {
                                if (this.state.chatId === -1) {
                                    this.setState({
                                        chatId: token.chatId
                                    });
                                }
                                this.state.connected();
                            } else {
                                this.state.disconnected();
                            }
                        } else {
                            this.state.disconnected();
                        }
                    } catch (err) {
                        this.state.disconnected();
                    }
                } else {
                    this.state.disconnected();
                }
            })
        }
        catch (e) {
            this.state.disconnected();
            return;
        }

    };
    render() {
        return (
            <>
                <AlertMessageDialog ref={this.alertDialog} />
                <AccountContext.Provider value={this.state}>
                    {this.props.children}
                </AccountContext.Provider>
            </>
        );
    }
}
