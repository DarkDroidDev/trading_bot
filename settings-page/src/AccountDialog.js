import React from "react";
import { Form, Modal, Button } from "react-bootstrap";
import { MdClose, MdError, MdRunCircle, MdSave } from "react-icons/md";
import { AccountContext } from "./AppContext";
import { accountSaveData } from "./AppServices";

const DIALOG_ELEMENT_REF = document.querySelector("#modal-account-dialog");

export default class AccountDialog extends React.Component {
    modal = React.createRef();

    state = {
        show: false,
        errorMsg: null,
        successMsg: null,
        wait: false
    }

    formRef = React.createRef();
    form = null;

    componentDidMount() {
        if (this.formRef && this.formRef.current) {
            this.form = this.formRef.current;

        }
    }
    dataLoaded = false;
    addCloseEvent(_callback) {
        DIALOG_ELEMENT_REF.addEventListener('alertDialogClosed', _callback);
    }

    addSaveDataEvent(_callback) {
        DIALOG_ELEMENT_REF.addEventListener('saveAccountDataHandler', _callback);
    }
    handleClose() {
        this.setState({
            wait: false,
            successMsg: null,
            errorMsg: null
        })
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogClosed"));
    }

    onCloseClick() {
        this.setState({ show: false });
        this.handleClose();
    }

    onConfirmClick() {
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogConfirmed"));
        this.onCloseClick();
    }

    open() {
        this.setState({ show: true });
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogOpenend"));
    }

    async onSaveData() {
        try {
            const form = this.formRef.current;
            const data = {
                binanceKey: form['binanceKey'].value,
                binanceSecret: form['binanceSecret'].value,
                binanceTestnet: form['testnet-account'].checked,
            }

            if (!data.binanceKey) {
                this.setState({
                    wait: false,
                    successMsg: null,
                    errorMsg: 'The Binance api key is required'
                });
                return;
            }

            if (!data.binanceSecret) {
                this.setState({
                    wait: false,
                    successMsg: null,
                    errorMsg: 'The Binance api secret is required'
                })
                return;
            }
            this.setState({
                errorMsg: null,
                successMsg: null,
                wait: true
            })
            const saveData = await accountSaveData(data);

            if (saveData && saveData.data) {
                this.setState({
                    wait: false,
                    successMsg: 'Ok the account was saved and strategy stopped',
                    errorMsg: null
                })

                DIALOG_ELEMENT_REF.dispatchEvent(new Event("saveAccountDataHandler"));
            }
            else {
                this.setState({
                    wait: false,
                    successMsg: null,
                    errorMsg: 'Error while saving account, check the data and retry'
                })
            }
        } catch (err) {
            this.setState({
                wait: false,
                successMsg: null,
                errorMsg: null
            })
            console.error(err);
        }
    }
    renderErrorMsg() {
        return <div className="alert alert-danger text-center" >
            <Button variant="danger" size="sm" className="ml-5" onClick={() => {
                this.setState({
                    errorMsg: null
                })
            }}>
             <MdError />  {this.state.errorMsg}
            </Button>
        </div>
    }

    renderSuccessMsg() {
        return <div className="alert alert-success text-center">
            <Button variant="success" size="sm" className="ml-5" onClick={() => {
                this.setState({
                    successMsg: null
                })
            }}>
                <MdRunCircle /> {this.state.successMsg}
            </Button>
        </div>
    }

    renderWaitMsg() {
        return <div className="alert alert-success text-center">
            <MdRunCircle /> Wait Until data was saved, do not close this dialog...
        </div>
    }
    render() {
        return (
            <Modal
                className="modal-open"
                ref={this.modal}
                show={this.state.show || this.props.show}
                centered={true}
                size="lg"
                onHide={this.handleClose}
            >
                <Modal.Header closeButton onClick={() => this.onCloseClick()}>
                    <Modal.Title> User Account </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <AccountContext.Consumer>
                        {(account) => {
                            if (this.state.wait) {
                                return this.renderWaitMsg();
                            }

                            if (this.state.successMsg) {
                                return this.renderSuccessMsg();
                            }

                            if (this.state.errorMsg) {
                                return this.renderErrorMsg();
                            }
                            return (<Form ref={this.formRef}>
                                <Form.Group className="mb-3" controlId="binanceKey">
                                    <Form.Label size="lg"> Binance Api Key </Form.Label>
                                    <Form.Control size="lg" name="binanceKey" defaultValue={this.props.appKey} type="text" maxLength={1000} placeholder="Binance Key" />
                                    <Form.Text size="lg" className="text-muted">
                                        <b> *Any edits in this field the strategy will stop, after that you need restart it</b>
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="binanceSecret">
                                    <Form.Label size="lg"> Binance Secret </Form.Label>
                                    <Form.Control size="lg" name="binanceSecret" defaultValue={this.props.appSecret} type="text" maxLength={1000} placeholder="Binance Secret" />
                                    <Form.Text size="lg" className="text-muted">
                                        <b>*Any edits in this field the strategy will stop, after that you need restart it</b>
                                    </Form.Text>
                                    <Form.Check
                                        type="switch"
                                        name="testnet-account"
                                        id="testnet-account"
                                        label="Testnet account"
                                        defaultChecked={this.props.testnet}
                                    />
                                    <Form.Text size="lg" className="text-muted">
                                        <b>*Any edits in this field the strategy will stop, after that you need restart it</b>
                                    </Form.Text>
                                </Form.Group>
                            </Form>
                            )
                        }}
                    </AccountContext.Consumer>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="primary" type="button" onClick={async () => await this.onSaveData()}> <MdSave /> Save </Button>
                    <Button variant="danger" type="button" onClick={() => this.onCloseClick()}> <MdClose /> Close </Button>
                </Modal.Footer>
            </Modal>
        )
    }
}