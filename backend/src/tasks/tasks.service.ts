import { Injectable, NotFoundException } from '@nestjs/common';
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