// Email validation for BDO format
export function validateBDOEmail(email: string): boolean {
	const bdoEmailRegex = /^[a-z]+\.[a-z]+@bdo\.co\.zw$/;
	return bdoEmailRegex.test(email);
}

// Password validation (basic for now, can be enhanced)
export function validatePassword(password: string): boolean {
	return password.length >= 6; // Minimum 6 characters
}

// Session name validation
export function validateSessionName(name: string): boolean {
	return name.trim().length >= 3 && name.trim().length <= 100;
}

// Question validation
export function validateQuestion(question: Question): boolean {
	return (
		question.text.trim().length >= 10 &&
		question.options.length === 4 &&
		question.options.every(opt => opt.trim().length > 0) &&
		question.correctAnswer >= 0 && question.correctAnswer <= 3 &&
		question.explanation.trim().length >= 10
	);
}

// Quiz submission validation
export function validateQuizSubmission(answers: number[]): boolean {
	return answers.length === 5 && answers.every(answer => answer >= 0 && answer <= 3);
}

// Import types
interface Question {
	text: string;
	options: string[];
	correctAnswer: number;
	explanation: string;
}

