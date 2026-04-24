import { useState } from 'react'


async function testCall() {
    try
    {
        const response = await fetch("/api/db-check")
        console.log(await response.json());
        
    }
    catch (error)
    {
        console.log(error)
    }
}

function App() {
  
    return (
    <>
        <button onClick={testCall}>Api test + Db check</button>
    </>
  )
}

export default App
