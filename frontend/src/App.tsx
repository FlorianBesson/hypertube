import { useState } from 'react'


async function testCall() {
    try
    {
        // const response = await fetch("/api/db-check")
        const response = await fetch("/api/auth/register", {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify({username: "Hello", password: "12345678"})
        })
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
            <button
                className='bg-amber-200 p-3 rounded-lg cursor-pointer hover:bg-amber-100'
                onClick={testCall}>Api test + Db check
            </button>
    </>
  )
}

export default App
