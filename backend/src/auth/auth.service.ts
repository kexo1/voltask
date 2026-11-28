import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  BCRYPT_SALT_ROUNDS,
  BROWSER_SESSION_MAX_AGE_MS,
  MAX_PASSWORD_BYTES,
  REFRESH_TOKEN_MAX_AGE_MS,
  TOKEN_RANDOM_BYTES_LENGTH,
} from './auth.constants';
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

const DUMMY_BCRYPT_HASH =
  '$2a$12$e8wNuU5L9d9zGZ0j8ZkY4ee7rU8yE1x1v7Gq7mJ8mY7vU6i5o4p3a';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, response: AuthHttpResponse) {
    if (Buffer.byteLength(registerDto.password, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        `Heslo môže mať najviac ${MAX_PASSWORD_BYTES} bajtov`,
      );
    }

    const passwordHash = await hash(
      registerDto.password,
      BCRYPT_SALT_ROUNDS,
    );

    try {
      const refreshToken = randomBytes(TOKEN_RANDOM_BYTES_LENGTH).toString(
        'base64url',
      );
      const rememberMe = registerDto.stayLoggedIn ?? false;
      const now = new Date();

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
        throw new ConflictException('Účet s touto e-mailovou adresou už existuje');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto, response: AuthHttpResponse) {
    if (Buffer.byteLength(loginDto.password, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        `Heslo môže mať najviac ${MAX_PASSWORD_BYTES} bajtov`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: { ...userResponseSelect, passwordHash: true },
    });

    const hashToVerify = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
    const isPasswordValid = await compare(loginDto.password, hashToVerify);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Nesprávny e-mail alebo heslo');
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
      throw new UnauthorizedException('Platnosť prihlasovacej relácie vypršala');
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
      throw new UnauthorizedException('Platnosť prihlasovacej relácie vypršala');
    }

    const newRefreshToken = randomBytes(TOKEN_RANDOM_BYTES_LENGTH).toString(
      'base64url',
    );
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
      throw new UnauthorizedException('Platnosť prihlasovacej relácie vypršala');
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
      throw new UnauthorizedException('Vyžaduje sa prihlásenie');
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
    const refreshToken = randomBytes(TOKEN_RANDOM_BYTES_LENGTH).toString(
      'base64url',
    );
    const now = new Date();

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

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredSessions(): Promise<void> {
    const result = await this.prisma.authSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Odstránených ${result.count} expirovaných relácií.`);
    }
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
      now.getTime() +
        (rememberMe ? REFRESH_TOKEN_MAX_AGE_MS : BROWSER_SESSION_MAX_AGE_MS),
    );
  }
}
