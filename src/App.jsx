import React from 'react';
import ConnectionPage from './pages/ConnectionPage';
import { NotificationProvider } from './components/NotificationCenter';

function App() {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-dark-950">
        <ConnectionPage />
      </div>
    </NotificationProvider>
  );
}

export default App;