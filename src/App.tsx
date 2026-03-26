import React from 'react';
import ConversationList from './components/ConversationList';
import { ToastContainer } from 'react-toastify';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Conversaciones de HiChat</h1>
      <ConversationList />
      <ToastContainer />
    </div>
  );
};

export default App;
