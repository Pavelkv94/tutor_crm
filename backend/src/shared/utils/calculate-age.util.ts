export const calculateAgeFromBirthDate = (
	birthDate: Date | string | null | undefined,
	referenceDate: Date = new Date(),
): number | null => {
	if (!birthDate) {
		return null;
	}

	const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
	if (Number.isNaN(birth.getTime())) {
		return null;
	}

	let age = referenceDate.getFullYear() - birth.getFullYear();

	const hasHadBirthdayThisYear =
		referenceDate.getMonth() > birth.getMonth() ||
		(referenceDate.getMonth() === birth.getMonth() &&
			referenceDate.getDate() >= birth.getDate());

	if (!hasHadBirthdayThisYear) {
		age--;
	}

	return age;
};
