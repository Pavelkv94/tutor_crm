export const STUDENT_CLASS_OPTIONS = [
  { value: 0, label: 'Дошкольник' },
  ...Array.from({ length: 11 }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  })),
  { value: -1, label: 'Взрослый' },
] as const

export const formatStudentClassLabel = (studentClass: number): string => {
  if (studentClass === -1) return 'Взрослый'
  if (studentClass === 0) return 'Дошкольник'
  return String(studentClass)
}

/** Short form for lists/cards: "5кл", "Дошкольник", "Взрослый" */
export const formatStudentClassShort = (studentClass: number): string => {
  if (studentClass === -1 || studentClass === 0) {
    return formatStudentClassLabel(studentClass)
  }
  return `${studentClass}кл`
}

/** Phrase form: "5 класс", "Дошкольник", "Взрослый" */
export const formatStudentClassPhrase = (studentClass: number): string => {
  if (studentClass === -1 || studentClass === 0) {
    return formatStudentClassLabel(studentClass)
  }
  return `${studentClass} класс`
}
