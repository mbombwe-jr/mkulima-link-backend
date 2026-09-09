import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(code: string, message: string, status: HttpStatus, detail?: string) {
    super({ code, message, detail }, status);
  }
}
