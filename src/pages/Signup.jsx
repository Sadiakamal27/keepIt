import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useState } from "react"
import { Link, useNavigate, Navigate} from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

function Signup() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { user, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const success = signup(email, password)
    if (success) {
    alert ("You successfully signed up..you can login now")
      navigate("/login")
    
    }
    else alert("Invalid signup - Please try again")
  }

  
  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center space-y-2">
        <h1 className="text-4xl font-bold mb-4">Signup</h1>
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Please enter your details</p>
      </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-1">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
               </div>
              </div>

        <Button type="submit" className="w-full items-center" variant="default">
            Sign Up
        </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                
              </div>
            </div>

            
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/login" className="text-blue-600 ">Login</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
  )
}

export default Signup