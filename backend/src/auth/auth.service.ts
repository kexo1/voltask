import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma, type User } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const userResponseSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (Buffer.byteLength(registerDto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 bytes');
    }

    const passwordHash = await hash(registerDto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          displayName: registerDto.displayName,
          passwordHash,
        },
        select: userResponseSelect,
      });

      return this.createAuthResponse(user);
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

  async login(loginDto: LoginDto) {
    if (Buffer.byteLength(loginDto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 bytes');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !(await compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  }

  private async createAuthResponse(
    user: Pick<User, 'id' | 'email' | 'displayName' | 'createdAt'>,
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }
}
