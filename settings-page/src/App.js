import React from "react";
import AlertMessageDialog from "./AlertMessage";
import { AccountContext } from "./AppContext";
import AuthCodeForm from "./AuthCodeForm";
import SettingsForm from "./SettingsForm";
import SpinnerDialog from "./SpinnerDialog";

export default class App extends React.Component {

  constructor() {
    super();
    window.addEventListener('ACCOUNT_CACHED"', this.onAccountCached.bind(this));
    window.addEventListener('ACCOUNT_CONNECTED_ERROR"', this.onAccountError.bind(this));

    this.state = {
      authenticated: false,
      alertValriant: 'light',
      alertmessage: ''
    }
    this.account = null;
    this.alertRef = React.createRef();
    this.spinnerDialogRef = React.createRef();
    this.alertDialog = null;
    this.spinnerDialog = null;
    this.accountLoaded = false;
  }


  componentDidMount() {
    this.alertDialog = this.alertRef.current;
    this.spinnerDialog = this.spinnerDialogRef.current;
    //this.spinnerDialog.show('settings loading....')
  }

  componentWillUnmount() {
    window.removeEventListener('ACCOUNT_CACHED"', this.onAccountCached.bind(this));
    window.removeEventListener('ACCOUNT_CONNECTED_ERROR"', this.onAccountError.bind(this));
  }

  onAccountCached = async () => {
    this.setState({ authenticated: true });
    this.spinnerDialog.hide();
  }

  onAccountError = async () => {
    this.setState({ authenticated: false });
    this.spinnerDialog.hide();
  }

  async onLogin(authCode) {
    if (this.account) {
      const result = await this.account.login(authCode);

      if (!result) {
        this.alertDialog.onOpenDialog(`The provided code is not valid`,`Auth code error`);
      }

    }
    else {
      this.alertDialog.current.onOpenDialog('Error to validate code', 'Error');
    }
  }
  renderAuthForm() {
    return <AuthCodeForm onLogin={async (authCode) => await this.onLogin(authCode)} alertValriant={this.state.alertValriant} alertmessage={this.state.alertmessage} />;
  }

  renderSettingsForm() {
    return <SettingsForm />;
  }

  render() {
    return (
      <>
        <AlertMessageDialog ref={this.alertRef} />
        <SpinnerDialog ref={this.spinnerDialogRef} />
        <div className="App">
          <section className="App-body">
            <AccountContext.Consumer>
              {(account) => {
                if (!this.accountLoaded) {
                  this.accountLoaded = true;
                  this.account = account;
                  this.account.connected = this.onAccountCached.bind(this);
                  this.account.disconnected = this.onAccountError.bind(this);
                  this.account.onConnect();
                }
              }}
            </AccountContext.Consumer>
             {(this.state.authenticated) ? this.renderSettingsForm(): this.renderAuthForm()}
          </section>
        </div></>

    )
  }
}
