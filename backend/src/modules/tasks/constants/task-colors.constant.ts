export const TASK_COLORS = [
	'bg-yellow-200',
	'bg-pink-200',
	'bg-green-200',
	'bg-blue-200',
	'bg-orange-200',
	'bg-purple-200',
] as const;

export const pickTaskColor = (totalTasksCount: number): string => {
	return TASK_COLORS[totalTasksCount % TASK_COLORS.length];
};
