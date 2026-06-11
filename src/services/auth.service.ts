// src/services/auth.service.ts
import User from '../models/user.model';
import { IUser, UserRole } from '../types/user.types';
import { generateToken } from '../utils/jwt';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  role: UserRole;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

export class AuthService {
  public async register(userData: RegisterUserInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    // Create new user
    const user = await User.create(userData);

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  public async login(loginData: LoginUserInput): Promise<AuthResponse> {
    // Find user by email
    const user = await User.findOne({ email: loginData.email });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(loginData.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  public async getUserProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return user;
  }
}
