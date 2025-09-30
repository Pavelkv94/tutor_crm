import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import "./CurrentTime.styles.scss";

const CurrentTime = () => {
	const [currentTime, setCurrentTime] = useState<{ utc2: string; utc3: string }>({ utc2: '', utc3: '' });
	// Update current time every second
	useEffect(() => {
		const updateTime = () => {
			const currentMoment = new Date(); // timestamp всегда в UTC

			// UTC+2
			const utc2String = currentMoment.toLocaleTimeString('pl-PL', {
				timeZone: 'Europe/Warsaw',
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});

			// UTC+3
			const utc3String = currentMoment.toLocaleTimeString('ru-BY', {
				timeZone: 'Europe/Minsk',
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});

			setCurrentTime({ utc2: utc2String, utc3: utc3String });
		};

		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="current-time">
			<div style={{ textAlign: 'center' }}>
				<div style={{ display: 'flex', gap: '20px' }}>
					<div>
						<Typography fontWeight="bold">Minsk</Typography>
						<Typography variant="h6" color="primary" fontWeight="bold">{currentTime.utc3}</Typography>
					</div>
					<div>
						<Typography fontWeight="bold">Warsaw</Typography>
						<Typography variant="h6" color="primary" fontWeight="bold">{currentTime.utc2}</Typography>
					</div>
				</div>
			</div>
		</div>
	)
}

export default CurrentTime