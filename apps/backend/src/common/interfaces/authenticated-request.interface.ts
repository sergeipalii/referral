export interface RequestUser {
  id: string;
  [key: string]: any;
}

export default interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
