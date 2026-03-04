import type { QuizResponse } from '$lib/stores/responses';

// Generate department comparison chart data
export function generateDepartmentChartData(responses: QuizResponse[]) {
	const departmentData = {
		Tax: { scores: [] as number[], count: 0 },
		IT: { scores: [] as number[], count: 0 },
		Audit: { scores: [] as number[], count: 0 }
	};

	responses.forEach(response => {
		departmentData[response.department].scores.push(response.score);
		departmentData[response.department].count++;
	});

	const labels = Object.keys(departmentData);
	const averages = labels.map(dept => {
		const data = departmentData[dept as keyof typeof departmentData];
		return data.scores.length > 0
			? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
			: 0;
	});

	const counts = labels.map(dept => departmentData[dept as keyof typeof departmentData].count);

	return {
		labels,
		datasets: [
			{
				label: 'Average Score (%)',
				data: averages,
				backgroundColor: ['#0066CC', '#00C49F', '#FFBB28'], // BDO colors
				borderColor: ['#0052A3', '#00A085', '#E6A820'],
				borderWidth: 1,
			}
		]
	};
}

// Generate score distribution chart data
export function generateScoreDistributionData(responses: QuizResponse[]) {
	const scoreRanges = {
		'0-20': 0,
		'21-40': 0,
		'41-60': 0,
		'61-80': 0,
		'81-100': 0
	};

	responses.forEach(response => {
		if (response.score <= 20) scoreRanges['0-20']++;
		else if (response.score <= 40) scoreRanges['21-40']++;
		else if (response.score <= 60) scoreRanges['41-60']++;
		else if (response.score <= 80) scoreRanges['61-80']++;
		else scoreRanges['81-100']++;
	});

	return {
		labels: Object.keys(scoreRanges),
		datasets: [
			{
				label: 'Number of Responses',
				data: Object.values(scoreRanges),
				backgroundColor: '#E31837', // BDO red
				borderColor: '#C41430',
				borderWidth: 1,
			}
		]
	};
}

// Generate performance trend data for a user
export function generatePerformanceTrendData(responses: QuizResponse[]) {
	// Sort responses by date
	const sortedResponses = responses
		.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
		.slice(-10); // Last 10 responses

	const labels = sortedResponses.map((_, index) => `Quiz ${index + 1}`);
	const scores = sortedResponses.map(r => r.score);

	return {
		labels,
		datasets: [
			{
				label: 'Score (%)',
				data: scores,
				borderColor: '#00C49F', // BDO green
				backgroundColor: 'rgba(0, 196, 159, 0.1)',
				tension: 0.4,
				fill: true,
			}
		]
	};
}

// Calculate overall statistics
export function calculateOverallStats(responses: QuizResponse[]) {
	if (responses.length === 0) {
		return {
			totalParticipants: 0,
			averageScore: 0,
			highestScore: 0,
			lowestScore: 0,
			completionRate: 0
		};
	}

	const scores = responses.map(r => r.score);
	const totalScore = scores.reduce((sum, score) => sum + score, 0);

	return {
		totalParticipants: responses.length,
		averageScore: Math.round(totalScore / responses.length),
		highestScore: Math.max(...scores),
		lowestScore: Math.min(...scores),
		completionRate: 100 // All responses are completed by definition
	};
}

// Get department-specific stats
export function getDepartmentStats(responses: QuizResponse[], department: 'Tax' | 'IT' | 'Audit') {
	const deptResponses = responses.filter(r => r.department === department);

	if (deptResponses.length === 0) {
		return {
			count: 0,
			averageScore: 0,
			highestScore: 0,
			lowestScore: 0
		};
	}

	const scores = deptResponses.map(r => r.score);
	const totalScore = scores.reduce((sum, score) => sum + score, 0);

	return {
		count: deptResponses.length,
		averageScore: Math.round(totalScore / deptResponses.length),
		highestScore: Math.max(...scores),
		lowestScore: Math.min(...scores)
	};
}

