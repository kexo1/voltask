import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma, TeamRole, type User } from '../generated/prisma/client';
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
      const user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            email: registerDto.email,
            displayName: registerDto.displayName,
            passwordHash,
          },
          select: userResponseSelect,
        });

        const team = await transaction.team.create({
          data: { name: 'Môj tím' },
        });
        await transaction.teamMember.create({
          data: {
            teamId: team.id,
            userId: createdUser.id,
            role: TeamRole.OWNER,
          },
        });

        return createdUser;
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

    await this.ensureDefaultTeam(user.id);

    return this.createAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  }

  private async ensureDefaultTeam(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
    });
    if (membership) return;

    await this.prisma.$transaction(async (transaction) => {
      const existingMembership = await transaction.teamMember.findFirst({
        where: { userId },
        select: { teamId: true },
      });
      if (existingMembership) return;

      const team = await transaction.team.create({
        data: { name: 'Môj tím' },
      });
      await transaction.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamRole.OWNER,
        },
      });
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
