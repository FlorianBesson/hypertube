

async function testCall() {
    try
    {
        const response = await fetch("/api/ping")
        // console.log(await response.json());
        console.log(response);
        
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
