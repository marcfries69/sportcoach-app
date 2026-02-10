import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App = () => {
  const [user, setUser] = useState(null);

  const handleDevLogin = () => {
    setUser({
      id: 'dev-user',
      name: 'Dev Sportler',
      avatar: null
    });
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onDevLogin={handleDevLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
