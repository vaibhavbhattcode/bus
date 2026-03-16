import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`[Gateway] New connection attempt from ${client.id}`);
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`[Gateway] Connection attempt without token from ${client.id}`);
        client.disconnect();
        return;
      }

      // Log part of the token for debugging (security: do not log full token in prod)
      this.logger.log(`[Gateway] Token received for ${client.id}: ${token.substring(0, 15)}...`);

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      
      this.addUserSocket(userId, client.id);
      client.data.userId = userId;
      
      this.logger.log(`[Gateway] User connected: ${userId} (Socket: ${client.id})`);
    } catch (e) {
      this.logger.error(`[Gateway] Connection unauthorized for ${client.id}:`, e.message);
      client.emit('auth_error', { message: 'Authentication failed: ' + e.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.removeUserSocket(userId, client.id);
      this.logger.log(`User disconnected: ${userId}`);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) return undefined;
    
    return auth.replace('Bearer ', '');
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    if (this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  sendNotificationToUser(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }
}
