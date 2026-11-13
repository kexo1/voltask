import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';
import { ACCESS_COOKIE, readCookie } from '../auth/auth-cookies';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    server.use(async (client, next) => {
      const configuredOrigin =
        process.env.FRONTEND_URL ?? 'http://localhost:5173';
      let allowedOrigin: string;
      try {
        allowedOrigin = new URL(configuredOrigin).origin;
      } catch {
        next(new Error('FRONTEND_URL must be a valid origin'));
        return;
      }

      if (client.handshake.headers.origin !== allowedOrigin) {
        next(new Error('Request origin is not allowed'));
        return;
      }

      const token = readCookie(
        client.handshake.headers.cookie,
        ACCESS_COOKIE,
      );
      if (!token) {
        next(new Error('Authentication is required'));
        return;
      }

      let payload: { sub?: unknown; email?: unknown; sid?: unknown };
      try {
        payload = await this.jwtService.verifyAsync<{
          sub?: unknown;
          email?: unknown;
          sid?: unknown;
        }>(token);
      } catch {
        next(new Error('Authentication is required'));
        return;
      }

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.sid !== 'string'
      ) {
        next(new Error('Authentication is required'));
        return;
      }

      let session: { user: { id: string; email: string } } | null;
      try {
        session = await this.prisma.authSession.findFirst({
          where: {
            id: payload.sid,
            userId: payload.sub,
            expiresAt: { gt: new Date() },
          },
          select: { user: { select: { id: true, email: true } } },
        });
      } catch (error) {
        next(
          error instanceof Error
            ? error
            : new Error('Failed to validate authentication session'),
        );
        return;
      }
      if (!session || session.user.email !== payload.email) {
        next(new Error('Authentication is required'));
        return;
      }

      client.data.userId = session.user.id;
      next();
    });
  }

  @SubscribeMessage('joinTeam')
  async handleJoinTeam(
    @MessageBody() teamId: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (typeof teamId !== 'string' || teamId.length === 0) {
      throw new WsException('A valid team ID is required');
    }

    const userId = client.data.userId;
    if (typeof userId !== 'string') {
      throw new WsException('Authentication is required');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { teamId: true },
    });
    if (!membership) {
      throw new WsException('Team not found');
    }

    await client.join(`team:${teamId}`);
    return { joined: teamId };
  }

  emitToTeam(teamId: string, event: string, payload: unknown) {
    this.server.to(`team:${teamId}`).emit(event, payload);
  }
}
