import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  // TODO: po pridaní autentifikácie overiť, že používateľ je členom tímu
  @SubscribeMessage('joinTeam')
  handleJoinTeam(
    @MessageBody() teamId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`team:${teamId}`);
    return { joined: teamId };
  }

  emitToTeam(teamId: number, event: string, payload: unknown) {
    this.server.to(`team:${teamId}`).emit(event, payload);
  }
}
