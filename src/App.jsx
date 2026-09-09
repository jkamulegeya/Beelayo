import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/authContext.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreateEvent from './pages/CreateEvent.jsx'
import EventDetails from './pages/EventDetails.jsx'
import Rsvp from './pages/Rsvp.jsx'
import Layout from './components/Layout.jsx'
import { Spinner } from './components/ui.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/e/:slug" element={<Rsvp />} />
      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="create" element={<CreateEvent />} />
        <Route path="event/:id" element={<EventDetails />} />
        <Route path="event/:id/edit" element={<CreateEvent />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
