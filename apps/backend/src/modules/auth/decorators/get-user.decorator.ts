import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import AuthenticatedRequest from '../../../common/interfaces/authenticated-request.interface';

export const GetUser = createParamDecorator(
  (data: 'id' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (data) return user?.[data];
    return user;
  },
);
