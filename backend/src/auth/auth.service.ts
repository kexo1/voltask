import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  clearAuthCookies,
  readCookie,
  REFRESH_COOKIE,
  setAuthCookies,
} from './auth-cookies';
import type { AuthHttpResponse, AuthUserResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userResponseSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} as const;

const REMEMBER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const BROWSER_SESSION_MS = 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, response: AuthHttpResponse) {
    if (Buffer.byteLength(registerDto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 bytes');
    }

    const passwordHash = await hash(registerDto.password, 12);

    try {
      const refreshToken = randomBytes(32).toString('base64url');
      const rememberMe = registerDto.stayLoggedIn ?? false;
      const now = new Date();

      await this.prisma.authSession.deleteMany({
        where: { expiresAt: { lte: now } },
      });

      const { user, sessionId } = await this.prisma.$transaction(
        async (transaction) => {
          const createdUser = await transaction.user.create({
            data: {
              email: registerDto.email,
              displayName: registerDto.displayName,
              passwordHash,
            },
            select: userResponseSelect,
          });
          const session = await transaction.authSession.create({
            data: {
              userId: createdUser.id,
              refreshTokenHash: hashRefreshToken(refreshToken),
              rememberMe,
              lastUsedAt: now,
              expiresAt: this.getSessionExpiry(rememberMe, now),
            },
            select: { id: true },
          });

          return { user: createdUser, sessionId: session.id };
        },
      );

      await this.setAuthCookies(
        user,
        sessionId,
        refreshToken,
        rememberMe,
        response,
      );
      return { user };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto, response: AuthHttpResponse) {
    if (Buffer.byteLength(loginDto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 bytes');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: { ...userResponseSelect, passwordHash: true },
    });

    if (!user || !(await compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...userResponse } = user;
    await this.startSession(
      userResponse,
      loginDto.stayLoggedIn ?? false,
      response,
    );
    return { user: userResponse };
  }

  async refresh(cookieHeader: string | undefined, response: AuthHttpResponse) {
    const refreshToken = readCookie(cookieHeader, REFRESH_COOKIE);
    if (!refreshToken) {
      clearAuthCookies(response);
      throw new UnauthorizedException('Authentication session has expired');
    }

    const oldTokenHash = hashRefreshToken(refreshToken);
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: oldTokenHash },
      include: { user: { select: userResponseSelect } },
    });

    if (!session || session.expiresAt <= now) {
      if (session) {
        await this.prisma.authSession.deleteMany({
          where: { id: session.id, refreshTokenHash: oldTokenHash },
        });
      }
      clearAuthCookies(response);
      throw new UnauthorizedException('Authentication session has expired');
    }

    const newRefreshToken = randomBytes(32).toString('base64url');
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const nextExpiresAt = this.getSessionExpiry(session.rememberMe, now);
    const updated = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: oldTokenHash,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: newTokenHash,
        lastUsedAt: now,
        expiresAt: nextExpiresAt,
      },
    });

    if (updated.count !== 1) {
      clearAuthCookies(response);
      throw new UnauthorizedException('Authentication session has expired');
    }

    await this.setAuthCookies(
      session.user,
      session.id,
      newRefreshToken,
      session.rememberMe,
      response,
    );

    return { user: session.user };
  }

  async logout(cookieHeader: string | undefined, response: AuthHttpResponse) {
    const refreshToken = readCookie(cookieHeader, REFRESH_COOKIE);
    if (refreshToken) {
      await this.prisma.authSession.deleteMany({
        where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      });
    }

    clearAuthCookies(response);
    return { success: true };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userResponseSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    return { user };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: updateProfileDto.displayName },
      select: userResponseSelect,
    });

    return { user };
  }

  private async startSession(
    user: AuthUserResponse,
    rememberMe: boolean,
    response: AuthHttpResponse,
  ): Promise<void> {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.prisma.authSession.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        rememberMe,
        lastUsedAt: now,
        expiresAt: this.getSessionExpiry(rememberMe, now),
      },
    });

    await this.setAuthCookies(
      user,
      session.id,
      refreshToken,
      rememberMe,
      response,
    );
  }

  private async setAuthCookies(
    user: AuthUserResponse,
    sessionId: string,
    refreshToken: string,
    rememberMe: boolean,
    response: AuthHttpResponse,
  ): Promise<void> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, sid: sessionId },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    setAuthCookies(response, accessToken, refreshToken, rememberMe);
  }

  private getSessionExpiry(rememberMe: boolean, now: Date): Date {
    return new Date(
      now.getTime() + (rememberMe ? REMEMBER_SESSION_MS : BROWSER_SESSION_MS),
    );
  }
}
