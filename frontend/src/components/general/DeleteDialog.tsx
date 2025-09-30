import { useState } from "react"
import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from "@mui/material/Typography"
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';


export const DeleteDialog = ({ dialogTitle, onDelete }: { dialogTitle: string, onDelete: () => void }) => {

	const [open, setOpen] = useState(false)

	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleDelete = () => {
		onDelete()
		handleClose()
	}

	return (
		<React.Fragment>
			<Button variant="outlined" color="error" onClick={handleClickOpen}>
				<DeleteForeverIcon />
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, width: "500px" }}>
					<Typography variant="body1">Вы уверены, что хотите удалить этот элемент?</Typography>
					{dialogTitle === "Удалить студента" && <Typography variant="body1">Запись о студенте будет удалена из списков, но записи о проведенных с ним занятиях останутся.</Typography>}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Отмена</Button>
					<Button type="submit" variant="contained" color="error" onClick={handleDelete}>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</React.Fragment>)
}