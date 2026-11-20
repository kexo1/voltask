import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectsService } from './projects.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class DashboardController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.dashboardSummary(user.id);
  }
}
