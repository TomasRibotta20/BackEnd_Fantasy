declare global {
  namespace Express {
    interface Request {
      authUser: {
        user: {
          userId: number;
          username: string;
          email: string;
          role: string;
          iat?: number;
          exp?: number;
        } | null;
      };
    }
  }
}

export {};
