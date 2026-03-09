import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SupportService } from './support.service';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: 'support',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(
    private jwtService: JwtService,
    private supportService: SupportService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) return client.disconnect();
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      
      this.logger.log(`Client connected: ${client.id} (User: ${client.data.userId}, Role: ${client.data.role})`);
      
      // If admin, join admin room
      if (client.data.role === 'ADMIN') {
        client.join('admins');
      }
    } catch (e) {
      this.logger.error(`Connection error: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody('ticketId') ticketId: string,
  ) {
    client.join(`ticket:${ticketId}`);
    this.logger.log(`User ${client.data.userId} joined ticket room: ${ticketId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; message: string },
  ) {
    const isAdmin = client.data.role === 'ADMIN';
    
    try {
      const reply = await this.supportService.addReply(
        data.ticketId,
        client.data.userId,
        data.message,
        isAdmin,
      );

      // Broadcast to ticket room
      this.server.to(`ticket:${data.ticketId}`).emit('new_message', reply);
      
      // If user sent it, notify admins
      if (!isAdmin) {
        this.server.to('admins').emit('ticket_activity', {
          ticketId: data.ticketId,
          userId: client.data.userId,
          message: data.message,
        });
      }
    } catch (e) {
      client.emit('error', { message: e.message });
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    return auth?.replace('Bearer ', '');
  }
}
