import React from "react";
import { Modal, Spinner } from "react-bootstrap";

const DIALOG_ELEMENT_REF = document.querySelector("#spinner-alert-message");

export default class SpinnerDialog extends React.Component {
    modal = React.createRef();

    state = {
        message: 'loading.... please wait',
        show: false
    }

    componentDidMount() {
    }
    handleClose = () => {
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogClosed"));
    }

    handleShow = () => {
        const dialog = document.querySelector(".spinner-dialog .modal-content");

        if (dialog) {
            dialog.classList.remove('modal-content');
            dialog.classList.add('spinner-content');
        }
    }

    hide() {
        this.setState({ show: false });
    }

    show(message) {
        if (message) {
            this.setState({ message });
        }
        else {
            this.setState({ message: '' });
        }
        this.setState({ show: true });
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogOpenend"));
    }

    setMessage(message) {
        this.setState({ message });
    }

    render() {
        // console.log('inside Presale consumer ', translations);
        return <Modal container={DIALOG_ELEMENT_REF}
            key={(new Date()).getTime()}
            className="spinner-dialog"
            ref={this.modal}
            show={this.state.show}
            keyboard={true}
            centered={true}
            backdrop="static"
            onShow={() => this.handleShow()}
            onHide={() => this.handleClose()}
        >
            <div className="m-auto text-center">
                <Spinner animation="grow" variant="warning" />
                <div className="text p-2"> <h2>{this.state.message}</h2> </div>
            </div>
        </Modal>
    }
}
