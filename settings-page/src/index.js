import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { AccountStore } from './AppContext';
import { SettingsStore } from './SettingsContext';

ReactDOM.render(

  <React.StrictMode>
    <AccountStore>
      <SettingsStore>
        <App />
      </SettingsStore>
    </AccountStore>
  </React.StrictMode>,
  document.getElementById('root')
);