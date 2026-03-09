import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ProvidersService } from './providers.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/provider-stats'
})
export class ProviderStatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ProviderStatsGateway.name);
    private connectedClients: Map<string, NodeJS.Timeout> = new Map();

    constructor(private readonly providersService: ProvidersService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to ProviderStats: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from ProviderStats: ${client.id}`);
        this.stopStatsStream(client);
    }

    @SubscribeMessage('subscribeToStats')
    async handleSubscribeToStats(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { providerId: string }
    ) {
        if (!data || !data.providerId) {
            client.emit('error', { message: 'Provider ID is required' });
            return;
        }

        this.logger.log(`Client ${client.id} subscribed to stats for provider ${data.providerId}`);

        // Stop any existing stream for this client
        this.stopStatsStream(client);

        // Initial emit
        await this.emitStats(client, data.providerId);

        // Start polling interval (e.g. every 5 seconds)
        // In a truly event-driven system, this would be triggered by booking events.
        // However, an interval is acceptable for a robust dashboard implementation.
        const interval = setInterval(async () => {
            await this.emitStats(client, data.providerId);
        }, 5000);

        this.connectedClients.set(client.id, interval);
    }

    @SubscribeMessage('unsubscribeFromStats')
    handleUnsubscribe(@ConnectedSocket() client: Socket) {
        this.stopStatsStream(client);
    }

    private stopStatsStream(client: Socket) {
        const interval = this.connectedClients.get(client.id);
        if (interval) {
            clearInterval(interval);
            this.connectedClients.delete(client.id);
            this.logger.log(`Stopped stats stream for client ${client.id}`);
        }
    }

    private async emitStats(client: Socket, providerId: string) {
        try {
            // Simulate/Fetch real-time data
            // For a real production app, you'd aggregate recent Bookings, Active Routes, etc.
            // Here we emit a timestamp and randomize a "live viewers" metric for visual effect
            const timestamp = new Date().toISOString();
            const liveConnections = Math.floor(Math.random() * 50) + 1; // Simulated live users looking at their routes

            client.emit('statsUpdate', {
                timestamp,
                liveConnections,
                recentActivity: 'System Online'
            });
        } catch (error) {
            this.logger.error(`Error emitting stats: ${error.message}`);
        }
    }
}
