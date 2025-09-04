import Grid from "@mui/material/Grid"
import "./Home.styles.scss"
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from 'react';
import { DayCell } from "./DayCell/DayCell";
import Typography from "@mui/material/Typography";
import { getDaysInWeeks } from "./getDaysInWeeks";
import Drawer from "@mui/material/Drawer";
import { Lesson } from "./Lesson/Lesson";
import CurrentTime from "./CurrentTime/CurrentTime";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Preloader from "../Preloader/Preloader";

const Home = () => {
	const [selectedPeriod, setSelectedPeriod] = useState<Dayjs>(dayjs(new Date()));

	const { isLoading, isError } = useQuery({
		queryKey: ["lessons", selectedPeriod],
		queryFn: () => {
			return axios.get(`${import.meta.env.VITE_API_URL}/lessons?start_date=${selectedPeriod.startOf('month').toISOString()}&end_date=${selectedPeriod.endOf('month').toISOString()}`)
		},
	})

	const daysInMonth = selectedPeriod?.daysInMonth() || 0;
	const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

	const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

	const [openDrawer, setOpenDrawer] = useState(false);

	const handleDayClick = (lesson: any) => () => {
		setSelectedLesson(lesson);
		setOpenDrawer(true)
	}

	// Создаем массив часов от 8:00 до 22:00 для UTC+2 и UTC+3
	const hoursUTC2: string[] = [];
	const hoursUTC3: string[] = [];
	for (let i = 9; i <= 20; i++) {
		const timeUTC3 = `${(i).toString().padStart(2, '0')}:00`;
		const timeUTC2 = `${(i - 1).toString().padStart(2, '0')}:00`;
		hoursUTC2.push(timeUTC2);
		hoursUTC3.push(timeUTC3);
	}

	const timeInUTC3 = new Date(new Date().toLocaleString("en-US", { timeZone: "Etc/GMT-3" }))
	const isNowMonth = timeInUTC3.getMonth() === new Date(selectedPeriod.toDate())?.getMonth()

	const weeks = getDaysInWeeks(selectedPeriod, daysInMonth);


	if (isLoading) return <Preloader isLoading={isLoading} />

	if (isError) return <div>Error</div>

	return (
		<div className="home">
			<div className="home-header">
				<CurrentTime />
				<DatePicker
					label="Period"
					views={['year', 'month']}
					openTo="month"
					value={selectedPeriod}
					onChange={(newValue) => setSelectedPeriod(newValue as Dayjs)}
				/>
			</div>
			<section>
				{/* Заголовок с днями недели */}
				<Grid container sx={{ marginBottom: 1 }}>
					{/* Колонки времени */}
					<Grid size={0.5} sx={{ backgroundColor: "#f0e8f8", borderRight: "2px solid #333" }}>
						<Typography variant="body2" sx={{ textAlign: "center", fontWeight: "bold" }}>
							Minsk
							<br />
							(UTC+3)
						</Typography>
					</Grid>
					<Grid size={0.5} sx={{ backgroundColor: "#e8f4f8", borderRight: "1px solid #ddd" }}>
						<Typography variant="body2" sx={{ textAlign: "center", fontWeight: "bold" }}>
							Warsaw
							<br />
							(UTC+2)
						</Typography>
					</Grid>
					{/* Дни недели */}
					{weekDays.map((day, index) => (
						<Grid size={1.57} key={index} sx={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", backgroundColor: "#fffca8" }}>
							<Typography>{day}</Typography>
						</Grid>
					))}
				</Grid>

				{/* Каждая неделя как отдельный блок */}
				{weeks.map((week, weekIndex) => (
					<div key={weekIndex} style={{ marginBottom: "10px", border: "2px solid #ddd", borderRadius: "8px" }}>
						{/* Заголовок недели с числами */}
						<Grid container sx={{ backgroundColor: "#f9f9f9", borderBottom: "1px solid #ddd" }}>
							<Grid size={0.5} sx={{ backgroundColor: "#e0e0e0", borderRight: "1px solid #ddd" }}>
							</Grid>
							<Grid size={0.5} sx={{ backgroundColor: "#e0e0e0", borderRight: "2px solid #333" }}>
							</Grid>
							{week.map((dayNumber, dayIndex) => (
								<Grid size={1.57} key={dayIndex} sx={{ textAlign: "center", borderRight: dayIndex < 6 ? "1px solid #ddd" : "none", background: selectedPeriod?.date() === dayNumber && isNowMonth ? "#8777ff" : "white" }}>
									<Typography sx={{ fontWeight: dayNumber ? "bold" : "normal", color: dayNumber ? "black" : "#ccc" }}>
										{dayNumber || ""}
									</Typography>
								</Grid>
							))}
						</Grid>

						{/* Часы для этой недели */}
						{hoursUTC2.map((hourUTC2, hourIndex) => (
							<Grid container key={hourIndex}
							//  sx={{ borderBottom: hourIndex < hoursUTC2.length - 1 ? "1px solid #eee" : "none" }}
							>


								{/* Колонка времени UTC+3 */}
								<Grid size={0.5} sx={{
									backgroundColor: "#f0e8f8",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: "20px",
									borderRight: "1px solid #ddd"

								}}>
									<Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "0.8rem" }}>
										{hoursUTC3[hourIndex]}
									</Typography>
								</Grid>

								{/* Колонка времени UTC+2 */}
								<Grid size={0.5} sx={{
									backgroundColor: "#e8f4f8",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: "20px",
									borderRight: "2px solid #333"

								}}>
									<Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "0.8rem" }}>
										{hourUTC2}
									</Typography>
								</Grid>

								{/* Ячейки дней для этого часа */}
								{week.map((dayNumber, dayIndex) => (
									<Grid size={1.57} key={dayIndex} sx={{
										backgroundColor: dayNumber ? "white" : "#f9f9f9"
									}}
										className="popover-wrapper"

									>
										{dayNumber && <DayCell
											hour={hourUTC2}
											hourUTC3={hoursUTC3[hourIndex]}
											day={dayNumber}
											selectedPeriod={selectedPeriod}
											onClick={handleDayClick({
												hourUTC3: hoursUTC3[hourIndex],
												day: dayNumber,
												selectedPeriod: selectedPeriod,
												weekDay: weekDays[dayIndex]
											})}
										/>}
										{dayNumber && <div className="popovers">{`${dayNumber}.${selectedPeriod.format("MM.YYYY")} ${hoursUTC3[hourIndex]}, ${weekDays[dayIndex]}`}</div>}
									</Grid>
								))}
							</Grid>
						))}
					</div>
				))}
			</section>
			<Drawer
				anchor={"right"}
				open={openDrawer}
				onClose={() => setOpenDrawer(false)}
			>
				<Lesson lesson={selectedLesson} onClose={() => setOpenDrawer(false)} />
			</Drawer>
		</div>
	)
}

export default Home