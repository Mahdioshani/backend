import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export interface CustomRpcExceptionResponse {
  error: HttpException;
  details?: any;
}

export class CustomRpcException extends RpcException {
  constructor(
    public err: CustomRpcExceptionResponse
  ) {
    super(err);
    this.name = 'RpcException';
  }
  catch(exception: CustomRpcException) {
    return exception
  }
}