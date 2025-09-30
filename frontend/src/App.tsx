import { Route, Routes } from 'react-router-dom'
import Home from './components/home/Home'
import Header from './components/header/Header'
import "./App.css"
import Students from './components/students/Students'
import Plans from './components/plans/Plans'
import firstGifer from './assets/gifers/0.gif'
import secondGifer from './assets/gifers/1.gif'
import thirdGifer from './assets/gifers/2.gif'
import fourthGifer from './assets/gifers/3.gif'
import fifthGifer from './assets/gifers/4.gif'
import sixthGifer from './assets/gifers/5.gif'
import seventhGifer from './assets/gifers/6.gif'
import eighthGifer from './assets/gifers/7.gif'
import ninthGifer from './assets/gifers/8.gif'
import tenthGifer from './assets/gifers/9.gif'
import { useEffect, useState } from 'react'

const gifers = [firstGifer, secondGifer, thirdGifer, fourthGifer, fifthGifer, sixthGifer, seventhGifer, eighthGifer, ninthGifer, tenthGifer]

function App() {

	const [showGifer, setShowGifer] = useState(false)
	const randomGifer = gifers[Math.floor(Math.random() * gifers.length)]

	const hour = 1000 * 60 * 60 * 1;

	useEffect(() => {
		const interval = setInterval(() => {
			setShowGifer(true)
		}, hour)

		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		if (showGifer) {
			const timeout = setTimeout(() => {
				setShowGifer(false)
			}, 1000 * 10)
			return () => clearTimeout(timeout)
		}
	}, [showGifer])

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
			{showGifer && <div className="gifer">
				<img src={randomGifer} width={100} height={100} alt="gifer" />
			</div>}
		</div>
	)
}

export default App
