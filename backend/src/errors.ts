export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: string[]) => new HttpError(400, message, details);
export const notFound = (message: string) => new HttpError(404, message);
