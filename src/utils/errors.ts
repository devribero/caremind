export function normalizeError(input: unknown, fallbackMessage = 'Erro inesperado'): Error {
	if (input instanceof Error) return input;
	if (typeof input === 'string') return new Error(input);
	try {
		// Tenta serializar para capturar objetos como Event
		const maybe = JSON.stringify(input);
		return new Error(maybe && maybe !== '{}' ? maybe : fallbackMessage);
	} catch {
		return new Error(fallbackMessage);
	}
}


