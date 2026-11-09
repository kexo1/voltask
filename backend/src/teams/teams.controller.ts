import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @Headers('authorization') authorization?: string,
  ) {
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearerToken) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    let payload: { sub?: unknown };
    try {
      payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(
        bearerToken,
      );
    } catch {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    return this.teamsService.create(createTeamDto, payload.sub);
  }
}
