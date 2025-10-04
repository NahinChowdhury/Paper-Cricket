import React from 'react';
import './App.css';
import SpinPie from './Spin';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Paper Cricket</h1>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
          <SpinPie />
        </div>
      </header>
    </div>
  );
}

export default App;