import React from "react";
import { Button, ButtonGroup, Form } from "react-bootstrap";
import AlertMessageDialog from "./AlertMessage";
import { AccountContext } from "./AppContext";
import SpinnerDialog from "./SpinnerDialog";
import { MdAccountBox, MdExitToApp, MdRestartAlt, MdSave } from "react-icons/md";
import { SettingsContext } from "./SettingsContext";
import AccountDialog from "./AccountDialog";
import { accountData } from "./AppServices";

export default class SettingsForm extends React.Component {
  static contextType = AccountContext;
  state = {
    authenticated: false,
    accountDialogShow: false,
    appKey: "",
    appSecret: '',
    testnet: false
  }

  alertRef = React.createRef();
  spinnerDialogRef = React.createRef();
  alertDialog = null;
  spinnerDialog = null;
  settings = null;
  settingsLoaded = false;
  formRef = React.createRef();
  accountDialogRef = React.createRef();
  accountDialog = null;
  form = null;

  componentDidMount() {
    this.alertDialog = this.alertRef.current;
    this.spinnerDialog = this.spinnerDialogRef.current;
    if (this.formRef.current) {
      this.form = this.formRef.current;
    }

    if (this.accountDialogRef.current) {
      this.accountDialog = this.accountDialogRef.current;
     
      this.accountDialog.addCloseEvent(() => {
        this.setState({ accountDialogShow: false });
        this.setState({
          appKey: "",
          appSecret: '',
          testnet: false
        })
      });

      this.accountDialog.addSaveDataEvent(async ()=>{
        await this.loadAccountData();
      });
    }
  }

  onSaveSettings(event, settings) {
    try {
      if (!this.form) {
        this.form = this.formRef.current;
      }
      this.spinnerDialog.show(`await form validation`);
      event.preventDefault();
      const elementsForm = this.form;
      if (elementsForm) {
        const pair = elementsForm['pair'].value && elementsForm['pair'].value.trim().toUpperCase();
        const timeFrame = elementsForm['timeFrame'].value;
        const findPair = settings.symbols && settings.symbols.findIndex((t) => t.value === pair) !== -1;
        let settingsData = {
          chatId: settings.chatId
        };

        if (findPair) {

          // 7verifica se il pair e' cambiato
          const isPairChanged = settings.pair !== pair;
          if (isPairChanged) {
            this.spinnerDialog.show(`The symbol pair has been changed, the strategy will be stopped`);
          }

          const isTimeFrameChaged = settings.timeFrame !== timeFrame;
          if (isTimeFrameChaged) {
            this.spinnerDialog.show(`The Timeframe has been changed, the strategy will be stopped`);
          }

          let buildSuccess = false;
          const totalElements = elementsForm.elements.length
          // build data
          for (let i = 0; i < totalElements; i++) {
            const item = elementsForm.elements[i];
            try {
              if (item && item.name) {
                let value = item.value;
                // tranne timeframe e pait il resto sono numbers
                if (!!value) {
                  if (item.name !== 'pair' && item.name !== 'timeFrame') {
                    if (!isNaN(value)) {
                      value = Number(value);
                    }
                    else {
                      this.spinnerDialog.hide();
                      this.alertDialog.onOpenDialog(`Warning: wrong value for ${item.name}`, 'Error');

                      return;
                    }
                  } if (item.name === 'pair') {
                    value = value.trim().toUpperCase();
                  }

                  settingsData[item.name] = value;
                  buildSuccess = true;

                } else {
                  this.spinnerDialog.hide();
                  this.alertDialog.onOpenDialog(`Warning: all fields are required. Missing value for ${item}`, 'Error');
                  return;
                }
              }
            } catch (err) {
              console.error(err);
            }
          }

          if (buildSuccess) {
            settings.save(settingsData, isPairChanged || isTimeFrameChaged).then((saved) => {
              this.spinnerDialog.hide();
              if (saved) {
                this.alertDialog.onOpenDialog(`Ok all data has been saved successfully`, 'Success');
                settings.load();
              } else {
                this.alertDialog.onOpenDialog(`Sorry, unable to save data check inserted data or retry later`, 'Error');
              }

            }).catch((err) => {
              this.spinnerDialog.hide();
              console.error(err);
              this.alertDialog.onOpenDialog(`Sorry, unable to save data check inserted data or retry later`, 'Error');
            });
          }
          else {
            this.spinnerDialog.hide();
            this.alertDialog.onOpenDialog(`Sorry, unable to save data check inserted data or retry later`, 'Error');
          }
        }
        else {
          this.spinnerDialog.hide();
          this.alertDialog.onOpenDialog(`The selected pair ${pair} is not found`, 'Error');
        }
      } else {
        this.spinnerDialog.hide();
        this.alertDialog.onOpenDialog(`No elements in form`, 'Error');
      }

    } catch (err) {
      console.error(err);
    }
  }

  async loadAccountData() {
    if (!this.form && this.formRef.current) {
      this.form = this.formRef.current;
    }
    const accountInfo = await accountData();
    if (this.form && accountInfo && accountInfo.data) {
      // this.form['binanceKey'].value = accountInfo.data.binanceApiKey;
      // this.form['binanceSecret'].value = accountInfo.data.binanceSecret;
      // this.form['testnet-account'].checked = true;
      this.setState({
        appKey: accountInfo.data.binanceApiKey,
        appSecret: accountInfo.data.binanceSecret,
        testnet: accountInfo.data.binanceTestnet
      })
    }
  }

  async onEditAccount() {
    try {
     await this.loadAccountData();

     this.setState({ accountDialogShow: true });
     this.accountDialog.open();
    } catch (err) {
      console.error(err);
    }
  }

  render() {
    return (
      <>
        <AlertMessageDialog ref={this.alertRef} />
        <AccountDialog ref={this.accountDialogRef} show={this.state.accountDialogShow}
          appKey={this.state.appKey} appSecret={this.state.appSecret} testnet={this.state.testnet}
        />
        <SpinnerDialog ref={this.spinnerDialogRef} />

        <SettingsContext.Consumer>
          {(settings) => {
            this.settings = settings;
            if (!this.settingsLoaded) {
              this.settingsLoaded = true;
              settings.load();
            }
            if (settings.chatId === -1) return null;
            return <div className="container h-100">
              <div className="row h-100 justify-content-center align-items-center">
                <div className="col-10 col-md-8 col-lg-6">
                  <h1> Settings Data </h1>
                  <p className="description"> Change settings data.</p>
                  <header>
                    <h5> Last used pair {settings.pair}</h5>
                  </header>

                  <Form ref={this.formRef} onSubmit={(event) => {
                    event.stopPropagation();
                    this.onSaveSettings(event, settings);
                    return null;
                  }}>

                    <Form.Group className="mb-3" controlId="pair">
                      <Form.Label size="lg"> Pair </Form.Label>
                      <Form.Control size="lg" style={{ textTransform: "uppercase" }} name="pair" defaultValue={settings.pair} type="text" maxLength={10} placeholder="The Symbol of Pair" />
                      <Form.Text size="lg" className="text-muted">
                        <b> If you change the Pair, the strategy will be stopped.</b>
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="feesMax">
                      <Form.Label size="lg"> Fees Max </Form.Label>
                      <Form.Control size="lg" name="feesMax" step={0.01} defaultValue={settings.feesMax} type="number" maxLength={10} placeholder="Fee Max" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="levaMax">
                      <Form.Label size="lg"> Leva Max </Form.Label>
                      <Form.Control size="lg" name="levaMax" step={0.01} defaultValue={settings.levaMax} type="number" maxLength={10} placeholder="Leva Max" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longOrderAmount1">
                      <Form.Label size="lg"> Long OrderAmount 1 </Form.Label>
                      <Form.Control size="lg" name="longOrderAmount1" step={0.01} defaultValue={settings.longOrderAmount1} type="number" maxLength={100} placeholder="Long Order Amount 1" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longOrderAmount2">
                      <Form.Label size="lg"> Long OrderAmount 2 </Form.Label>
                      <Form.Control size="lg" name="longOrderAmount2" step={0.01} defaultValue={settings.longOrderAmount2} type="number" maxLength={100} placeholder="Long Order Amount 2" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longOrderAmount3">
                      <Form.Label size="lg"> Long OrderAmount 3 </Form.Label>
                      <Form.Control size="lg" name="longOrderAmount3" step={0.01} defaultValue={settings.longOrderAmount3} type="number" maxLength={100} placeholder="Long Order Amount 3" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longTradePricePercent1">
                      <Form.Label size="lg"> Long Trade Price Percent 1 </Form.Label>
                      <Form.Control size="lg" name="longTradePricePercent1" step={0.01} defaultValue={settings.longTradePricePercent1} type="number" maxLength={100} placeholder="Long Trade Price Percent 1" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longTradePricePercent2">
                      <Form.Label size="lg"> Long Trade Price Percent 2 </Form.Label>
                      <Form.Control size="lg" name="longTradePricePercent2" step={0.01} defaultValue={settings.longTradePricePercent2} type="number" maxLength={100} placeholder="Long Trade Price Percent 2" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="longTradePricePercent3">
                      <Form.Label size="lg"> Long Trade Price Percent 3 </Form.Label>
                      <Form.Control size="lg" name="longTradePricePercent3" step={0.01} defaultValue={settings.longTradePricePercent3} type="number" maxLength={100} placeholder="Long Trade Price Percent 3" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="shortOrderAmount1">
                      <Form.Label size="lg"> Short Order Amount 1 </Form.Label>
                      <Form.Control size="lg" name="shortOrderAmount1" step={0.01} defaultValue={settings.shortOrderAmount1} type="number" maxLength={100} placeholder="Short Order Amount 1" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="shortOrderAmount2">
                      <Form.Label size="lg"> Short Order Amount 2 </Form.Label>
                      <Form.Control size="lg" name="shortOrderAmount2" step={0.01} defaultValue={settings.shortOrderAmount2} type="number" maxLength={100} placeholder="Short Order Amount 2" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="shortOrderAmount3">
                      <Form.Label size="lg"> Short Order Amount 3 </Form.Label>
                      <Form.Control size="lg" name="shortOrderAmount3" step={0.01} defaultValue={settings.shortOrderAmount3} type="number" maxLength={100} placeholder="Short Order Amount 3" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="shortTradePricePercent1">
                      <Form.Label size="lg"> Short Trade Price Percent 1 </Form.Label>
                      <Form.Control size="lg" name="shortTradePricePercent1" step={0.01} defaultValue={settings.shortTradePricePercent1} type="number" maxLength={100} placeholder="Short Trade Price Percent 1" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="shortTradePricePercent2">
                      <Form.Label size="lg"> Short Trade Price Percent 2 </Form.Label>
                      <Form.Control size="lg" name="shortTradePricePercent2" step={0.01} defaultValue={settings.shortTradePricePercent2} type="number" maxLength={100} placeholder="Short Trade Price Percent 2" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>


                    <Form.Group className="mb-3" controlId="shortTradePricePercent3">
                      <Form.Label size="lg"> Short Trade Price Percent 3 </Form.Label>
                      <Form.Control size="lg" name="shortTradePricePercent3" step={0.01} defaultValue={settings.shortTradePricePercent3} type="number" maxLength={100} placeholder="Short Trade Price Percent 3" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="smartTakeProfit">
                      <Form.Label size="lg"> Smart Take Profit </Form.Label>
                      <Form.Control size="lg" name="smartTakeProfit" step={0.01} defaultValue={settings.smartTakeProfit} type="number" maxLength={100} placeholder="Smart Take Profit" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    {/* <Form.Group className="mb-3" controlId="startLevelPercent">
                      <Form.Label size="lg"> Start Level Percent </Form.Label>
                      <Form.Control size="lg" name="startLevelPercent" step={0.01} defaultValue={settings.startLevelPercent} type="number" maxLength={100} placeholder="Start Level Percent" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group> */}

                    <Form.Group className="mb-3" controlId="stopBotFor">
                      <Form.Label size="lg"> Stop Bot For </Form.Label>
                      <Form.Control size="lg" name="stopBotFor" step={1} min={1} max={100} defaultValue={settings.stopBotFor} type="number" placeholder="Stop Bot For" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="stopLossPercent">
                      <Form.Label size="lg"> Stop Loss Percent </Form.Label>
                      <Form.Control size="lg" name="stopLossPercent" step={0.01} defaultValue={settings.stopLossPercent} type="number" maxLength={100} placeholder="Stop Loss Percent" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="takeProfitPercent">
                      <Form.Label size="lg"> Take Profit Percent </Form.Label>
                      <Form.Control size="lg" name="takeProfitPercent" step={0.01} defaultValue={settings.takeProfitPercent} type="number" maxLength={100} placeholder="Take Profit Percent" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="limDMIMin">
                      <Form.Label size="lg"> Min Limit DMI </Form.Label>
                      <Form.Control size="lg" name="limDMIMin" step={0.01} defaultValue={settings.limDMIMin} type="number" maxLength={100} placeholder="Minimum DMI limit" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="limDMIMax">
                      <Form.Label size="lg"> Max Limit DMI </Form.Label>
                      <Form.Control size="lg" name="limDMIMax" step={0.01} defaultValue={settings.limDMIMax} type="number" maxLength={100} placeholder="Maximum DNI limit" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="timeFrame">
                      <Form.Label size="lg"> Time Frame </Form.Label>
                      <select defaultValue={settings.timeFrame} className="form-control form-control-lg custon-select" name="timeFrame">
                        <option value="5m">5m</option>
                        <option value="15m">15m</option>
                        <option value="30m">30m</option>
                        <option value="1h">1h</option>
                        <option value="2h">2h</option>
                        <option value="4h">4h</option>
                        <option value="6h">6h</option>
                        <option value="8h">8h</option>
                        <option value="12h">12h</option>
                        <option value="1D">1D</option>
                      </select>
                      {/* <Form.Control size="lg" name="timeFrame" defaultValue={settings.timeFrame} type="text" maxLength={10} placeholder="Time Frame" /> */}
                      <Form.Text size="lg" className="text-muted">
                        <b> If you change the Timeframe, the strategy will be stopped.</b>
                      </Form.Text>
                    </Form.Group>
                    {/* <Form.Group className="mb-3" controlId="timeOorderExpiration">
                      <Form.Label size="lg"> Time O Order Expiration </Form.Label>
                      <Form.Control size="lg" name="timeOorderExpiration" defaultValue={settings.timeOorderExpiration} type="text" maxLength={100} placeholder="Time O order Expiration" />
                      <Form.Text size="lg" className="text-muted">

                      </Form.Text>
                    </Form.Group> */}
                    <ButtonGroup size="lg" className="fixed-top w-50" style={{ margin: "0 auto" }} aria-label="Settings group">
                      <Button size="lg" variant="primary" className="m-1" type="submit">
                        <MdSave /> SAVE
                      </Button>

                      <Button size="lg" onClick={async () => await this.onEditAccount()} variant="success" className="m-1" type="button">
                        <MdAccountBox /> Account
                      </Button>

                      <Button size="lg" onClick={() => {
                        this.alertDialog.onOpenDialog("This action will stops current strategy and restart all server. Are you sure to execute it?",
                                "Restart Server","Yes","No",true);

                            this.alertDialog.onConfirmClickEventHandler(async ()=>{
                              this.alertDialog.onCloseClick();
                              this.spinnerDialog.show('Wait for restating server....');
                              await settings.restart();
                              this.spinnerDialog.hide();
                              this.alertDialog.onOpenDialog("Ok, The restart request was sended","Restating Server");
                            });
                        }} variant="dark" className="m-1" type="button">
                        <MdRestartAlt /> RESTART SERVER
                      </Button>

                      <Button size="lg" onClick={async () => await settings.exit()} variant="danger" className="m-1" type="button">
                        <MdExitToApp /> EXIT
                      </Button>
                    </ButtonGroup>
                  </Form>
                </div>
              </div>
            </div>
          }}
        </SettingsContext.Consumer>
      </>
    )
  }
}
