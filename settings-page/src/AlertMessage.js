import React from "react";
import { Modal } from "react-bootstrap";
import Button from "@restart/ui/esm/Button";

const DEFAULT_CLOSE_LABEL = "Close";
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DIALOG_ELEMENT_REF = document.querySelector("#modal-alert-message");

export default class AlertMessageDialog extends React.Component {
    modal = React.createRef();

    state = {
        title: '',
        description: '',
        confirmLabel: 'Confirm',
        closeLabel: 'Close',
        confirmDialog: false,
        show: false
    }

    handleClose() {
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogClosed"));
    }

    onCloseClick() {
        this.setState({ show: false });
    }

    onConfirmClick() {
        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogConfirmed"));
        this.onCloseClick();
    }
    onConfirmClickEventHandler(_callback) {
        DIALOG_ELEMENT_REF.addEventListener('alertDialogConfirmed', 
        function onConfirmed() {
            if(_callback)
            _callback();
        
            DIALOG_ELEMENT_REF.removeEventListener('alertDialogConfirmed',onConfirmed); 
        } );
    }
    onOpenDialog(message, title, confirmLabel, closeLabel, confirmDialog) {
        if (!closeLabel) {
            closeLabel = DEFAULT_CLOSE_LABEL
        }

        if (!confirmLabel) {
            confirmLabel = DEFAULT_CONFIRM_LABEL;
        }

        this.setState({ title, description: message, confirmLabel, closeLabel });
        this.setState({ show: true });

        this.setState({ confirmDialog: confirmDialog });

        DIALOG_ELEMENT_REF.dispatchEvent(new Event("alertDialogOpenend"));
    }


    render() {
        return (
            <Modal
                className="modal-open"
                ref={this.modal}
                show={this.state.show}
                centered={true}
                container={DIALOG_ELEMENT_REF}
                size="lg"
                onHide={this.handleClose}
            >
                <Modal.Header closeButton onClick={() => this.onCloseClick()}>
                    <Modal.Title> {this.state.title}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <p style={{ textAlign: "center", fontSize: "18px" }}>{this.state.description}</p>
                </Modal.Body>

                <Modal.Footer>
                    <Button className="btn btn-secondary" onClick={() => this.onCloseClick()}> {this.state.closeLabel} </Button>
                    {
                        (this.state.confirmDialog ? <Button className="btn btn-primary" onClick={() => this.onConfirmClick()}> {this.state.confirmLabel}</Button> : null)
                    }

                </Modal.Footer>
            </Modal>
        )
    }
}