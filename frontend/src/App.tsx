import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">PeopleOS</h1>
            <p className="text-gray-600">Frontend is running successfully!</p>
            <p className="text-sm text-gray-500 mt-4">
              Backend API Base: http://localhost:8000
            </p>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
