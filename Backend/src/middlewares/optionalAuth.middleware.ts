import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const optionalAuthenticate = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Agar token nahi hai, toh error mat do, bas guest (unauthenticated) maan kar aage jane do
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Agar token valid hai toh user info attach kar do
  } catch (error) {
    // Agar token expired ya invalid bhi hai, tab bhi guest treat karo taake tool na ruke
    req.user = undefined;
  }

  next();
};