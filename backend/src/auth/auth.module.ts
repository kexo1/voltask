import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET must contain at least 32 bytes');
        }

        return {
          secret,
          signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CsrfGuard, JwtAuthGuard],
  exports: [JwtModule, CsrfGuard, JwtAuthGuard],
})
export class AuthModule {}
