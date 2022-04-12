import React from "react";
import { Alert, Button, Form } from "react-bootstrap";
import AlertMessageDialog from "./AlertMessage";
import { AccountContext } from "./AppContext";
import SpinnerDialog from "./SpinnerDialog";

export default class AuthCodeForm extends React.Component {
    static contextType = AccountContext;
    state = {
        authenticated: false,
        alertmessage: '',
        alertValriant: ''
    }
    defaultMesage = "We'll never share your code with anyone else.";
    alertRef = React.createRef();
    spinnerDialogRef = React.createRef();
    alertDialog = null;
    spinnerDialog = null;
    account = null;
    refAuthCodeText = React.createRef();
    authCodeText = null;

    componentDidMount() {

        this.alertDialog = this.alertRef.current;
        this.spinnerDialog = this.spinnerDialogRef.current;
        this.authCodeText = this.refAuthCodeText.current;
        this.setState({ alertmessage: this.defaultMesage });

        if (this.props && this.props.alertValriant) {
            this.setState({ alertValriant: this.props.alertValriant });
        }

        if (this.props && this.props.alertmessage) {
            this.setState({ alertmessage: this.props.alertmessage });
        }
    }


    async login() {
        if (this.props && this.props.onLogin) {
            this.props.onLogin(this.authCodeText.value);
        }
    }

    render() {
        return (
            <>
                <AlertMessageDialog ref={this.alertRef} />
                <SpinnerDialog ref={this.spinnerDialogRef} />
                <div className="container h-100vh">
                    <div className="row h-100 justify-content-center align-items-center">
                        <div className="col-10 col-md-8 col-lg-6">
                            <h1> Change Bot Settings </h1>
                            <div className="description"> Put auth code sent by Telegram Bot.<br />
                                <hr />
                                <b>Note:</b> if The session is expired you can generate another code by click "Settings" button from Telegram bot
                                <hr />
                            </div>


                            <Form onSubmit={(evn)=>{
                                evn.preventDefault();
                                this.login();
                            }}>
                                <Form.Group className="mb-3" controlId="formAuthCodeText">
                                    <Form.Control ref={this.refAuthCodeText} size="lg" type="password" maxLength={8} placeholder="Authentication Code" />
                                    <Form.Text className="text-muted">
                                        <Alert variant={this.state.alertValriant}>
                                            We'll never share your code with anyone else.
                                        </Alert>
                                    </Form.Text>

                                </Form.Group>

                                <Button onClick={() => this.login()} size="lg" variant="primary" className="btn btn-block w-100" type="button">
                                    Login
                                </Button>

                            </Form>
                        </div>
                    </div>
                </div>
            </>
        )
    }
}
