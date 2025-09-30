import { useState } from "react"
import { PlanCurrency, PlanType, planTypes } from "../../App.constants"
import { durations } from "../../App.constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { currencies } from "../../App.constants"
import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"

type PlanBodyType = {
	plan_name: string;
	plan_price: number;
	plan_currency: PlanCurrency;
	duration: number;
	plan_type: PlanType;
}

export const PlanDialog = ({ btnTitle, dialogTitle }: { btnTitle: string, dialogTitle: string }) => {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [planBody, setPlanBody] = useState<PlanBodyType>({
		plan_name: "",
		plan_price: 0,
		plan_currency: PlanCurrency.BYN,
		duration: durations[0],
		plan_type: PlanType.INDIVIDUAL,
	})


	const { mutate } = useMutation({
		mutationFn: (plan: any) => {
			return axios.post(`${import.meta.env.VITE_API_URL}/plans`, plan)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plans"] })
		},
		onError: (error) => {
			console.log("ERROR", error)
		}
	})

	const currenciesOptions = currencies.map((currency) => ({
		label: `${currency.flag} ${currency.label}`,
		value: currency.label,
	}))

	const durationsOptions = durations.map((duration) => ({
		label: duration.toString(),
		value: duration.toString(),
	}))

	const planTypesOptions = planTypes.map((planType) => ({
		label: planType,
		value: planType,
	}))

	const isButtonDisabled = !planBody.plan_price || !planBody.plan_currency || !planBody.duration || !planBody.plan_type


	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleCreatePlan = () => {
		mutate({ ...planBody, plan_name: `${planBody.plan_type} ${planBody.duration} min` })
		setPlanBody({
			plan_name: "",
			plan_price: 0,
			plan_currency: PlanCurrency.BYN,
			duration: durations[0],
			plan_type: PlanType.INDIVIDUAL,
		})
		handleClose()
	}

	return (
		<React.Fragment>
			<Button variant="contained" color="secondary" onClick={handleClickOpen}>
				{btnTitle}
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, width: "500px" }}>

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Тип занятий</Typography>
						<Select
							labelId="demo-simple-select-label"
							id="demo-simple-select"
							value={planBody.plan_type}
							inputProps={{ 'aria-label': 'Without label' }}
							onChange={(e) => setPlanBody({ ...planBody, plan_type: e.target.value as PlanType })}
						>
							{planTypesOptions.map((plan, index) => <MenuItem key={index} value={plan.value}>{plan.label}</MenuItem>)}
						</Select>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Валюта</Typography>
						<Select
							value={planBody.plan_currency}
							inputProps={{ 'aria-label': 'Without label' }}
							onChange={(e) => setPlanBody({ ...planBody, plan_currency: e.target.value as PlanCurrency })}
						>
							{currenciesOptions.map((plan, index) => <MenuItem key={index} value={plan.value}>{plan.label}</MenuItem>)}
						</Select>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Стоимость занятий</Typography>
						<TextField
							autoFocus
							required
							margin="dense"
							type="number"
							fullWidth
							inputProps={{ 'aria-label': 'Without label' }}
							value={planBody.plan_price}
							onChange={(e) => setPlanBody({ ...planBody, plan_price: Number(e.target.value) })}
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<Typography style={{ margin: 0 }}>Длительность занятий</Typography>
						<Select
							value={planBody.duration}
							inputProps={{ 'aria-label': 'Without label' }}
							onChange={(e) => setPlanBody({ ...planBody, duration: Number(e.target.value) })}
						>
							{durationsOptions.map((plan, index) => <MenuItem key={index} value={plan.value}>{plan.label}</MenuItem>)}
						</Select>
					</div>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Отмена</Button>
					<Button type="submit" variant="contained" color="success" disabled={isButtonDisabled} onClick={handleCreatePlan}>
						Добавить план
					</Button>
				</DialogActions>
			</Dialog>
		</React.Fragment>)
}