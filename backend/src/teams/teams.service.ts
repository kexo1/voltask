import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus, TeamRole } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

type TeamProgress = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
};

const MAX_TEAMS_PER_USER = 10;
const MAX_TEAM_MEMBERS = 100;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const teams = await this.prisma.team.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
    const progressByTeam = await this.getProgressByTeam(
      teams.map(({ id }) => id),
    );

    return teams.map(({ _count, ...team }) => ({
      ...team,
      memberCount: _count.members,
      progress: progressByTeam.get(team.id)!,
    }));
  }

  async findOne(id: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, members: { some: { userId } } },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
          select: {
            role: true,
            joinedAt: true,
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: { select: { id: true, displayName: true } },
            creator: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team "${id}" was not found`);
    }

    const progress = (await this.getProgressByTeam([id])).get(id)!;
    return { ...team, progress };
  }

  create(createTeamDto: CreateTeamDto, creatorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockUser(transaction, creatorId);
      const membershipCount = await transaction.teamMember.count({
        where: { userId: creatorId },
      });
      if (membershipCount >= MAX_TEAMS_PER_USER) {
        throw new ConflictException(
          `A user cannot belong to more than ${MAX_TEAMS_PER_USER} teams`,
        );
      }

      const team = await transaction.team.create({
        data: createTeamDto,
      });
      await transaction.teamMember.create({
        data: {
          teamId: team.id,
          userId: creatorId,
          role: TeamRole.OWNER,
        },
      });
      return team;
    });
  }

  async delete(teamId: string, userId: string) {
    await this.requireOwner(teamId, userId);

    try {
      await this.prisma.team.delete({ where: { id: teamId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Team "${teamId}" was not found`);
      }

      throw error;
    }

    return { success: true };
  }

  async update(teamId: string, userId: string, updateTeamDto: UpdateTeamDto) {
    await this.requireOwner(teamId, userId);
    if (Object.keys(updateTeamDto).length === 0) {
      throw new BadRequestException('At least one team field must be provided');
    }

    try {
      return await this.prisma.team.update({
        where: { id: teamId },
        data: updateTeamDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Team "${teamId}" was not found`);
      }

      throw error;
    }
  }

  async addMember(
    teamId: string,
    actorId: string,
    addTeamMemberDto: AddTeamMemberDto,
  ) {
    const member = await this.prisma.user.findUnique({
      where: { email: addTeamMemberDto.email },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException('User account was not found');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.lockUser(transaction, member.id);
        await this.lockTeam(transaction, teamId);
        await this.requireOwner(teamId, actorId, transaction);

        const existingMembership = await transaction.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId: member.id } },
          select: { userId: true },
        });
        if (existingMembership) {
          throw new ConflictException('User is already a team member');
        }

        const userMembershipCount = await transaction.teamMember.count({
          where: { userId: member.id },
        });
        if (userMembershipCount >= MAX_TEAMS_PER_USER) {
          throw new ConflictException(
            `A user cannot belong to more than ${MAX_TEAMS_PER_USER} teams`,
          );
        }

        const teamMemberCount = await transaction.teamMember.count({
          where: { teamId },
        });
        if (teamMemberCount >= MAX_TEAM_MEMBERS) {
          throw new ConflictException(
            `A team cannot have more than ${MAX_TEAM_MEMBERS} members`,
          );
        }

        return transaction.teamMember.create({
          data: { teamId, userId: member.id, role: TeamRole.MEMBER },
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a team member');
      }

      throw error;
    }
  }

  async removeMember(teamId: string, actorId: string, memberId: string) {
    await this.requireOwner(teamId, actorId);
    const membership = await this.getMembership(teamId, memberId);

    if (membership.role === TeamRole.OWNER) {
      const ownerCount = await this.prisma.teamMember.count({
        where: { teamId, role: TeamRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ConflictException('A team must have at least one owner');
      }
    }

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberId } },
    });
    return { success: true };
  }

  async updateMemberRole(
    teamId: string,
    actorId: string,
    memberId: string,
    role: TeamRole,
  ) {
    await this.requireOwner(teamId, actorId);
    const membership = await this.getMembership(teamId, memberId);

    if (membership.role === TeamRole.OWNER && role === TeamRole.MEMBER) {
      const ownerCount = await this.prisma.teamMember.count({
        where: { teamId, role: TeamRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ConflictException('A team must have at least one owner');
      }
    }

    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: memberId } },
      data: { role },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  private async requireOwner(
    teamId: string,
    userId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = transaction ?? this.prisma;
    const membership = await client.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });

    if (!membership) {
      throw new NotFoundException(`Team "${teamId}" was not found`);
    }
    if (membership.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Team owner role is required');
    }
  }

  private async lockUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const users = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
    `;
    if (users.length === 0) {
      throw new NotFoundException('User account was not found');
    }
  }

  private async lockTeam(
    transaction: Prisma.TransactionClient,
    teamId: string,
  ): Promise<void> {
    const teams = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE
    `;
    if (teams.length === 0) {
      throw new NotFoundException(`Team "${teamId}" was not found`);
    }
  }

  private async getMembership(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    if (!membership) {
      throw new NotFoundException('Team member was not found');
    }

    return membership;
  }

  private async getProgressByTeam(
    teamIds: string[],
  ): Promise<Map<string, TeamProgress>> {
    const progressByTeam = new Map(
      teamIds.map((id) => [
        id,
        { total: 0, todo: 0, inProgress: 0, done: 0 },
      ]),
    );

    if (teamIds.length === 0) {
      return progressByTeam;
    }

    const taskCounts = await this.prisma.task.groupBy({
      by: ['teamId', 'status'],
      where: { teamId: { in: teamIds } },
      _count: { _all: true },
    });

    for (const { teamId, status, _count } of taskCounts) {
      const progress = progressByTeam.get(teamId)!;
      const count = _count._all;
      progress.total += count;

      switch (status) {
        case TaskStatus.TODO:
          progress.todo = count;
          break;
        case TaskStatus.IN_PROGRESS:
          progress.inProgress = count;
          break;
        case TaskStatus.DONE:
          progress.done = count;
          break;
      }
    }

    return progressByTeam;
  }
}
