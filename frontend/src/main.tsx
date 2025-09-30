import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./App.css"
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import "react-day-picker/style.css";
import { NotificationProvider } from './components/notifier/NotificationProvider.tsx';


export const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
	<QueryClientProvider client={queryClient}>
		<BrowserRouter>
			<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
				<NotificationProvider>
			<App />
				</NotificationProvider>
			</LocalizationProvider>
		</BrowserRouter>
	</QueryClientProvider>
)
