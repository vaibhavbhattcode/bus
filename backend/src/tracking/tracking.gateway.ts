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
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: 'tracking',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private trackingService: TrackingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) return client.disconnect();
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('join_route')
  async handleJoinRoute(
    @ConnectedSocket() client: Socket,
    @MessageBody('routeId') routeId: string,
  ) {
    client.join(`route:${routeId}`);
    // Send current location immediately if exists
    const location = await this.trackingService.getLocation(routeId);
    if (location) {
      client.emit('location_update', location);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateLocationDto,
  ) {
    if (client.data.role !== 'PROVIDER') return;

    try {
      const updatedData = await this.trackingService.updateLocation(
        client.data.userId,
        dto,
      );
      // Broadcast to everyone watching this route
      this.server.to(`route:${dto.routeId}`).emit('location_update', updatedData);
    } catch (e) {
      client.emit('error', { message: e.message });
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    return auth?.replace('Bearer ', '');
  }
}
