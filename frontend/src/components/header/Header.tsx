import "./Header.styles.scss"
import { Link, useLocation } from "react-router-dom"
import PriceChange from '@mui/icons-material/PriceChange';
import School from '@mui/icons-material/School';
import CalendarMonth from '@mui/icons-material/CalendarMonth';

const Header = () => {
	const location = useLocation()
	return (
		<div className="header">
			<Link to="/">
				<div className={`menu-item ${location.pathname === "/" ? "active" : ""}`}>
					<CalendarMonth sx={{ fontSize: 34 }}/>
				</div>
			</Link>
			<Link to="/students">
				<div className={`menu-item ${location.pathname === "/students" ? "active" : ""}`}>
					<School sx={{ fontSize: 34 }}/>
				</div>
			</Link>
			<Link to="/plans">
				<div className={`menu-item ${location.pathname === "/plans" ? "active" : ""}`}>
					<PriceChange sx={{ fontSize: 34 }}/>
				</div>
			</Link>
		</div>
	)
}

export default Header	