import { useState } from 'react'


async function testCall() {
    try
    {
        const response = await fetch("/api/")
        console.log(await response.text());
        
    }
    catch (error)
    {
        console.log(error)
    }
}

function App() {
  
    return (
    <>
        <button onClick={testCall}>Test API Call</button>
    </>
  )
}

export default App
