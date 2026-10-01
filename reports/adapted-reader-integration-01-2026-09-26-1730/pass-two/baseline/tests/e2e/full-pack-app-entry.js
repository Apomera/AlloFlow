'use strict';

const React = require('react');
const ReactDOM = require('react-dom/client');
const importedApp = require('../../desktop/web-app/src/App.jsx');
const App = importedApp.default || importedApp;

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));