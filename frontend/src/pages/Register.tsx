import { useState } from "react"

function RegisterForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        try
        {
            e.preventDefault()
            
            const form = e.target;
            const formData = new FormData(form);            
            const data = Object.fromEntries(formData.entries());
            
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            
            const resData = await response.json()
            if (!response.ok)
            {
                console.log("Bad response from server : ", resData)
                setError(resData.message)
                return ;
            }
            
            setError('')
            console.log(resData)
        }
        catch (error)
        {
            console.log("Fetch /api/auth/register failed ");
            console.log(error);
        }
    }
    
    return (
        <form method="post" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 p-5 max-w-2xl border">
                <div className="">
                    <label className="">Email
                        <input
                            name="email"
                            className="border ml-11"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        >
                        </input>
                    </label>
                </div>
                
                <div className="">
                    <label className="">Username
                        <input
                            name="username"
                            className="border ml-2"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                        >
                        </input>
                    </label>
                </div>
                
                <div className="">
                    <label className="">Password
                        <input
                            name="password"
                            className="border ml-3"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        >
                        </input>                        
                    </label>
                </div>
                {error && <p className="text-red-500">{error}</p>}
            </div>
            <button type="submit" className="p-5 border">Register</button>
        </form>
    )
    
}

export function RegisterView() {
    
    return (
        <div>
            <RegisterForm />
        </div>
    )
}