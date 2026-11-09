import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus, TeamRole } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

type TeamProgress = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
};

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const teams = await this.prisma.team.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
    const progressByTeam = await this.getProgressByTeam(teams.map(({ id }) => id));

    return teams.map(({ _count, ...team }) => ({
      ...team,
      memberCount: _count.members,
      progress: progressByTeam.get(team.id)!,
    }));
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
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
