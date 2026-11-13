import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';

const MAX_TASKS_PER_TEAM = 500;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    userId: string,
    teamId?: string,
    pagination?: { page: number; limit: number },
  ) {
    return this.prisma.task.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        team: { members: { some: { userId } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(pagination
        ? {
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
          }
        : {}),
    });
  }

  async create(createTaskDto: CreateTaskDto, creatorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockTeam(transaction, createTaskDto.teamId);

      const membership = await transaction.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: createTaskDto.teamId,
            userId: creatorId,
          },
        },
        select: { teamId: true },
      });

      if (!membership) {
        throw new NotFoundException(`Team ${createTaskDto.teamId} not found`);
      }

      const taskCount = await transaction.task.count({
        where: {
          teamId: createTaskDto.teamId,
        },
      });
      if (taskCount >= MAX_TASKS_PER_TEAM) {
        throw new ConflictException(
          `A team cannot have more than ${MAX_TASKS_PER_TEAM} tasks`,
        );
      }

      if (createTaskDto.assigneeId) {
        const assigneeMembership = await transaction.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: createTaskDto.teamId,
              userId: createTaskDto.assigneeId,
            },
          },
          select: { userId: true },
        });

        if (!assigneeMembership) {
          throw new NotFoundException('Assignee is not a member of this team');
        }
      }

      return transaction.task.create({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description || null,
          status: createTaskDto.status,
          teamId: createTaskDto.teamId,
          creatorId,
          assigneeId: createTaskDto.assigneeId ?? null,
        },
      });
    });
  }

  async updateStatus(id: string, status: TaskStatus, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        team: { members: { some: { userId } } },
      },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, team: { members: { some: { userId } } } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  private async lockTeam(
    transaction: Prisma.TransactionClient,
    teamId: string,
  ): Promise<void> {
    const teams = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE
    `;
    if (teams.length === 0) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }
  }
}
