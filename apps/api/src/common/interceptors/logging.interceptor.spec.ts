import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/health',
        }),
      }),
    } as unknown as ExecutionContext;
    mockCallHandler = {
      handle: () => of({ status: 'ok' }),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should call next handler and return observable', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({ status: 'ok' });
      },
      complete: () => done(),
    });
  });
});
