import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from './decorators/current-user.decorator';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
  AuthHttpResponse,
} from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ) {
    return this.authService.register(registerDto, response);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ) {
    return this.authService.login(loginDto, response);
  }

  @Post('refresh')
  refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ) {
    return this.authService.refresh(request.headers.cookie, response);
  }

  @Post('logout')
  logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ) {
    return this.authService.logout(request.headers.cookie, response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, updateProfileDto);
  }
}
