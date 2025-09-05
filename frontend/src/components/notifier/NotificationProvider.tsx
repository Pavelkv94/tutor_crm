// NotificationContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

type Notification = {
	message: string;
	severity: AlertColor; // 'error' | 'success' | 'info' | 'warning'
};

const NotificationContext = createContext<(msg: string, severity?: AlertColor) => void>(() => { });

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
	const [notification, setNotification] = useState<Notification | any>(null);
	const [open, setOpen] = useState(false);

	const showNotification = (message: string, severity: AlertColor = 'info') => {
		setNotification({ message, severity });
		setOpen(true);
	};

	return (
		<NotificationContext.Provider value={showNotification}>
			{children}
			<Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
				{notification && (
					<Alert severity={notification.severity} onClose={() => setOpen(false)}>
						{notification.message}
					</Alert>
				)}
			</Snackbar>
		</NotificationContext.Provider>
	);
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => useContext(NotificationContext);
