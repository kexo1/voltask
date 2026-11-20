import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TeamRole } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const MAX_PROJECT_MEMBERS = 100;

const projectInclude = {
  owner: { select: { id: true, displayName: true } },
  team: { select: { id: true, name: true } },
  members: {
    orderBy: { joinedAt: 'asc' },
    select: {
      userId: true,
      joinedAt: true,
      user: { select: { id: true, displayName: true, email: true } },
    },
  },
  _count: { select: { members: true, tasks: true } },
} satisfies Prisma.ProjectInclude;

function accessibleProjectsWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { teamId: null, ownerId: userId },
      {
        team: {
          is: { members: { some: { userId, role: TeamRole.OWNER } } },
        },
      },
      {
        teamId: { not: null },
        members: { some: { userId } },
        team: { is: { members: { some: { userId } } } },
      },
    ],
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: accessibleProjectsWhere(userId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: projectInclude,
    });
    return projects.map(({ _count, ...project }) => ({
      ...project,
      memberCount: _count.members,
      taskCount: _count.tasks,
    }));
  }

  async findOne(projectId: string, userId: string) {
    await this.requireAccess(projectId, userId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }

    const { _count, ...projectData } = project;
    return {
      ...projectData,
      memberCount: _count.members,
      taskCount: _count.tasks,
    };
  }

  async create(createProjectDto: CreateProjectDto, ownerId: string) {
    const projectId = await this.prisma.$transaction(async (transaction) => {
      if (createProjectDto.teamId) {
        await this.lockTeam(transaction, createProjectDto.teamId);
        const ownerMembership = await transaction.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: createProjectDto.teamId,
              userId: ownerId,
            },
          },
          select: { role: true },
        });

        if (!ownerMembership) {
          throw new NotFoundException(
            `Team "${createProjectDto.teamId}" was not found`,
          );
        }
        if (ownerMembership.role !== TeamRole.OWNER) {
          throw new ForbiddenException('Team owner role is required');
        }
      }

      const project = await transaction.project.create({
        data: {
          name: createProjectDto.name,
          description: createProjectDto.description ?? null,
          teamId: createProjectDto.teamId ?? null,
          ownerId,
          members: { create: { userId: ownerId } },
        },
        select: { id: true },
      });
      return project.id;
    });

    return this.findOne(projectId, ownerId);
  }

  async update(
    projectId: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ) {
    await this.requireManager(projectId, userId);
    if (Object.keys(updateProjectDto).length === 0) {
      throw new BadRequestException(
        'At least one project field must be provided',
      );
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: updateProjectDto,
    });
    return this.findOne(projectId, userId);
  }

  async delete(projectId: string, userId: string) {
    await this.requireManager(projectId, userId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  }

  async addMember(
    projectId: string,
    actorId: string,
    addProjectMemberDto: AddProjectMemberDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, projectId);
      const project = await this.requireManager(
        projectId,
        actorId,
        transaction,
      );
      if (!project.teamId) {
        throw new BadRequestException(
          'Personal projects cannot have additional members',
        );
      }

      const teamMembership = await transaction.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: addProjectMemberDto.userId,
          },
        },
        select: { userId: true },
      });
      if (!teamMembership) {
        throw new BadRequestException(
          'Project members must belong to the project team',
        );
      }

      const existingMembership = await transaction.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: addProjectMemberDto.userId,
          },
        },
        select: { userId: true },
      });
      if (existingMembership) {
        throw new ConflictException('User is already a project member');
      }

      const memberCount = await transaction.projectMember.count({
        where: { projectId },
      });
      if (memberCount >= MAX_PROJECT_MEMBERS) {
        throw new ConflictException(
          `A project cannot have more than ${MAX_PROJECT_MEMBERS} members`,
        );
      }

      return transaction.projectMember.create({
        data: { projectId, userId: addProjectMemberDto.userId },
        select: {
          userId: true,
          joinedAt: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      });
    });
  }

  async removeMember(projectId: string, actorId: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, projectId);
      const project = await this.requireManager(
        projectId,
        actorId,
        transaction,
      );
      if (!project.teamId) {
        throw new BadRequestException(
          'Personal projects cannot have additional members',
        );
      }

      const membership = await transaction.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { userId: true },
      });
      if (!membership) {
        throw new NotFoundException('Project member was not found');
      }

      await transaction.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });
      await transaction.task.updateMany({
        where: { projectId, assigneeId: userId },
        data: { assigneeId: null },
      });
      return { success: true, projectId, userId };
    });
  }

  async requireAccess(
    projectId: string,
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const project = await client.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, teamId: true },
    });
    if (!project) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }

    if (!project.teamId) {
      if (project.ownerId !== userId) {
        throw new NotFoundException(`Project "${projectId}" was not found`);
      }
      return project;
    }

    const teamMembership = await client.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: project.teamId, userId },
      },
      select: { role: true },
    });
    if (!teamMembership) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }
    if (teamMembership.role === TeamRole.OWNER) {
      return project;
    }

    const projectMembership = await client.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true },
    });
    if (!projectMembership) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }
    return project;
  }

  async canAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, teamId: true },
    });
    if (!project) {
      return false;
    }
    if (!project.teamId) {
      return project.ownerId === userId;
    }

    const teamMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
      select: { role: true },
    });
    if (!teamMembership) {
      return false;
    }
    if (teamMembership.role === TeamRole.OWNER) {
      return true;
    }

    return Boolean(
      await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { userId: true },
      }),
    );
  }

  async requireManager(
    projectId: string,
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const project = await client.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, teamId: true },
    });
    if (!project) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }
    if (!project.teamId) {
      if (project.ownerId !== userId) {
        throw new NotFoundException(`Project "${projectId}" was not found`);
      }
      return project;
    }

    const membership = await client.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
      select: { role: true },
    });
    if (!membership) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }
    if (membership.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Team owner role is required');
    }
    return project;
  }

  async findAccessibleProjectIds(userId: string): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      where: accessibleProjectsWhere(userId),
      select: { id: true },
    });
    return projects.map(({ id }) => id);
  }

  async dashboardSummary(userId: string) {
    const [teamCount, projectIds] = await Promise.all([
      this.prisma.teamMember.count({ where: { userId } }),
      this.findAccessibleProjectIds(userId),
    ]);
    const taskCount = projectIds.length
      ? await this.prisma.task.count({
          where: { projectId: { in: projectIds } },
        })
      : 0;

    return {
      teamCount,
      projectCount: projectIds.length,
      taskCount,
    };
  }

  private async lockProject(
    transaction: Prisma.TransactionClient,
    projectId: string,
  ): Promise<void> {
    const projects = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE
    `;
    if (projects.length === 0) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
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
}
