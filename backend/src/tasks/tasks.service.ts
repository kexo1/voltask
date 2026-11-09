import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.task.findMany({
      where: teamId === undefined ? undefined : { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createTaskDto: CreateTaskDto, creatorId: string) {
    const [team, assignee] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: createTaskDto.teamId },
        select: { id: true },
      }),
      createTaskDto.assigneeId
        ? this.prisma.user.findUnique({
            where: { id: createTaskDto.assigneeId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!team) {
      throw new NotFoundException(`Team ${createTaskDto.teamId} not found`);
    }

    if (createTaskDto.assigneeId && !assignee) {
      throw new NotFoundException(`Assignee ${createTaskDto.assigneeId} not found`);
    }

    return this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description || null,
        status: createTaskDto.status,
        teamId: createTaskDto.teamId,
        creatorId,
        assigneeId: createTaskDto.assigneeId ?? null,
      },
    });
  }

  async updateStatus(id: string, status: TaskStatus) {
    const task = await this.prisma.task.findUnique({
      where: { id },
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
}