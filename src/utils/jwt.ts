// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';
import { UnauthorizedError } from './errors';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  if (!environment.jwtSecret) {
    throw new Error("JWT secret is not set.");
  }

  const expiresIn = typeof environment.jwtExpiresIn === 'number'
    ? `${environment.jwtExpiresIn}s`
    : environment.jwtExpiresIn;

  const options: jwt.SignOptions = {
    expiresIn: '1h',
  };

  return jwt.sign(payload as object, environment.jwtSecret, options);
};


export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, environment.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
