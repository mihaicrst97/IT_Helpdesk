import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthResult, SafeUserResponse } from '../types/auth';
import { AppError } from '../types/errors';

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface UserWithCertifications {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: Date;
  certifications: Array<{
    certifiedAt: Date;
    category: {
      id: string;
      name: string;
    };
  }>;
}

const userCertificationsInclude = {
  certifications: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  },
} as const;

function toSafeUserResponse(user: UserWithCertifications): SafeUserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    certifications: user.certifications.map((cert) => ({
      id: cert.category.id,
      name: cert.category.name,
      certifiedAt: cert.certifiedAt,
    })),
  };
}

function signAuthToken(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    },
  );
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const createdUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      role: Role.USER,
    },
    include: userCertificationsInclude,
  });

  const safeUser = toSafeUserResponse(createdUser);
  const token = signAuthToken(safeUser);
  return { token, user: safeUser };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: userCertificationsInclude,
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const safeUser = toSafeUserResponse(user);
  const token = signAuthToken(safeUser);
  return { token, user: safeUser };
}

export async function getCurrentUser(userId: string): Promise<SafeUserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userCertificationsInclude,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return toSafeUserResponse(user);
}
