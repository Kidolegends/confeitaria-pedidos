// Erro "esperado" da regra de negócio, com o status HTTP que deve ser devolvido.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
