export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}
