import { Route, Routes } from 'react-router-dom'
import Home from './components/home/Home'
import Header from './components/header/Header'
import "./App.css"
import Students from './components/students/Students'
import Plans from './components/plans/Plans'

function App() {

	return (
		<div className="app">
			<Header />
			<div className="container">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/students" element={<Students />} />
					<Route path="/plans" element={<Plans />} />
					<Route path="*" element={<Home />} />
				</Routes>
			</div>
		</div>
	)
}

export default App
