import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { plansApi } from '@/api/plans'
import type { CreatePlanInput } from '@/types'
import { CURRENCIES, type Currency } from '@/constants/currency'

interface CreatePlanDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const CreatePlanDialog = ({ open, onOpenChange }: CreatePlanDialogProps) => {
	const [planPrice, setPlanPrice] = useState('')
	const [planCurrency, setPlanCurrency] = useState<Currency>('BYN')
	const [duration, setDuration] = useState('')
	const [planType, setPlanType] = useState<'INDIVIDUAL' | 'PAIR'>('INDIVIDUAL')
	const queryClient = useQueryClient()

	const createMutation = useMutation({
		mutationFn: (data: CreatePlanInput) => plansApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['plans'] })
			onOpenChange(false)
			setPlanPrice('')
			setPlanCurrency('BYN')
			setDuration('')
			setPlanType('INDIVIDUAL')
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!planPrice || !duration) return

		const data: CreatePlanInput = {
			plan_price: parseInt(planPrice, 10),
			plan_currency: planCurrency,
			duration: parseInt(duration, 10),
			plan_type: planType,
		}

		createMutation.mutate(data)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Создать тариф</DialogTitle>
					<DialogDescription>Добавить новый тарифный план в систему.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="planPrice">Цена</Label>
							<Input
								id="planPrice"
								type="number"
								min="0"
								value={planPrice}
								onChange={(e) => setPlanPrice(e.target.value)}
								placeholder="Например, 50"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="planCurrency">Валюта</Label>
							<Select value={planCurrency} onValueChange={(value: Currency) => setPlanCurrency(value)}>
								<SelectTrigger id="planCurrency" aria-label="Валюта">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((currency) => (
										<SelectItem key={currency.code} value={currency.code}>
											<span className="flex items-center gap-2">
												<span>{currency.flag}</span>
												<span>{currency.code}</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="duration">Длительность (минуты)</Label>
							<Input
								id="duration"
								type="number"
								min="1"
								value={duration}
								onChange={(e) => setDuration(e.target.value)}
								placeholder="Например, 60"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="planType">Тип тарифа</Label>
							<Select value={planType} onValueChange={(value: 'INDIVIDUAL' | 'PAIR') => setPlanType(value)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="INDIVIDUAL">Индивидуальный</SelectItem>
									<SelectItem value="PAIR">Парный</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Отмена
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? 'Создание...' : 'Создать'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

