import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuditorPage } from '@/pages/AuditorPage'
import { ConfigFileGeneratorPage } from '@/pages/ConfigFileGeneratorPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuditorPage />} />
        <Route path="/config-file-generator" element={<ConfigFileGeneratorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
