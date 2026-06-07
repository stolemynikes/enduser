
import './App.css'
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get("http://localhost:3000")
    .then((res) => {
      setMessage(res.data.message);
    })
    .catch((error) => {
      console.log(error);
    })
  })

  return (
    <>
    {message}
    </>
  )
}

export default App
