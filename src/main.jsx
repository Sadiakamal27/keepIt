import React from 'react';
import { AppProvider } from './contexts/AppContext.jsx';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';


ReactDOM.createRoot(document.getElementById('root')).render(

<React.StrictMode>
  <AppProvider>
  
  <BrowserRouter>
  <App />
  </BrowserRouter>
 
  </AppProvider>
</React.StrictMode>,

)