export type Department = 'Tax' | 'IT' | 'Audit';

export function getDepartmentFromEmail(email: string): Department {
	const lowerEmail = email.toLowerCase();

	if (lowerEmail.includes('tax')) {
		return 'Tax';
	} else if (lowerEmail.includes('it')) {
		return 'IT';
	} else {
		return 'Audit'; // Default department
	}
}

export function getDepartmentColor(department: Department): string {
	switch (department) {
		case 'Tax':
			return '#0066CC'; // Blue
		case 'IT':
			return '#00C49F'; // Green
		case 'Audit':
			return '#FFBB28'; // Orange
		default:
			return '#E31837'; // Red fallback
	}
}

export function getDepartmentDisplayName(department: Department): string {
	return department;
}

