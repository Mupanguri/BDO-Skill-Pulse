import type { Question, QuizSession } from '$lib/stores/sessions';

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Get random questions from a session
export function getRandomQuestions(session: QuizSession, count: number = 5): Question[] {
	if (session.questions.length <= count) {
		return shuffleArray(session.questions);
	}

	const shuffled = shuffleArray(session.questions);
	return shuffled.slice(0, count);
}

// Calculate quiz score
export function calculateScore(answers: number[], questions: Question[]): number {
	if (answers.length !== questions.length) {
		throw new Error('Number of answers must match number of questions');
	}

	let correct = 0;
	answers.forEach((answer, index) => {
		if (answer === questions[index].correctAnswer) {
			correct++;
		}
	});

	return Math.round((correct / questions.length) * 100);
}

// Validate quiz submission
export function validateQuizSubmission(answers: number[]): boolean {
	return answers.length === 5 && answers.every(answer =>
		typeof answer === 'number' && answer >= 0 && answer <= 3
	);
}

// Get question by ID
export function getQuestionById(questions: Question[], id: string): Question | undefined {
	return questions.find(q => q.id === id);
}

// Check if session is currently active (within 1 hour window)
export function isSessionActive(session: QuizSession): boolean {
	const now = new Date();
	const sessionDateTime = new Date(`${session.date}T${session.time}`);
	const endTime = new Date(sessionDateTime.getTime() + 60 * 60 * 1000); // 1 hour

	return session.isActive && now >= sessionDateTime && now <= endTime;
}

// Format time remaining for active session
export function getTimeRemaining(session: QuizSession): string {
	const now = new Date();
	const sessionDateTime = new Date(`${session.date}T${session.time}`);
	const endTime = new Date(sessionDateTime.getTime() + 60 * 60 * 1000); // 1 hour

	if (now > endTime) {
		return 'Expired';
	}

	const remainingMs = endTime.getTime() - now.getTime();
	const remainingMinutes = Math.floor(remainingMs / (1000 * 60));

	if (remainingMinutes < 1) {
		return '< 1 min';
	}

	return `${remainingMinutes} min`;
}

// Generate unique ID
export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

